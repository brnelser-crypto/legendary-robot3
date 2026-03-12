import type { BridgeQuote, PlannedRoute, RouteQuote, TradeIntent } from '@mde/domain'
import { createLogger } from '@mde/monitoring'
import type { ProtocolAdapter } from '@mde/protocols'
import { addBps, compareAmounts, safeBigInt, subtractAmounts } from '@mde/protocols'
import { BridgeRouter } from '@mde/bridges'
import { scoreRouteDetailed, type RouteScoreBreakdown, type RouteScoreInput } from './scoring.js'

export type PlannerDependencies = {
  adapters: Record<string, ProtocolAdapter>
  bridgeRouter: BridgeRouter
}

type AtomicVenueMode = 'same' | 'distinct' | 'any'

const FLASH_PROTOCOLS = new Set(['aave_v3', 'dydx'])
const SWAP_PROTOCOLS = new Set(['uniswap_v3', 'pancakeswap', 'sushiswap', 'curve'])

export class ExecutionPlanner {
  private readonly logger = createLogger('planner')

  constructor(private readonly deps: PlannerDependencies) {}

  async plan(intent: TradeIntent): Promise<PlannedRoute[]> {
    const strategyRoutes = await this.planByStrategy(intent)
    if (strategyRoutes.length > 0) {
      const ranked = this.finalizeRoutes(intent, strategyRoutes)
      this.logger.info('planned_strategy_routes', {
        intentId: intent.intentId,
        strategyType: intent.strategyType,
        count: ranked.length,
      })
      return ranked
    }

    if (intent.requireFlashLiquidity) {
      const atomicFallback = this.finalizeRoutes(intent, await this.buildAtomicRoutes(intent, 'any'))
      if (atomicFallback.length > 0) {
        this.logger.info('planned_atomic_routes', {
          intentId: intent.intentId,
          strategyType: intent.strategyType,
          count: atomicFallback.length,
          compatibilityFallback: true,
        })
        return atomicFallback
      }

      const flashEnvelopes = this.canFallbackToStandaloneFlash(intent)
        ? this.finalizeRoutes(intent, await this.buildStandaloneFlashRoutes(intent))
        : []

      if (flashEnvelopes.length > 0) {
        this.logger.info('planned_flash_envelopes', { intentId: intent.intentId, count: flashEnvelopes.length })
        return flashEnvelopes
      }

      this.logger.warn('no_supported_flash_routes', {
        intentId: intent.intentId,
        sourceChain: intent.sourceChain,
        strategyType: intent.strategyType,
        reason: 'repayable_cycle_not_found',
      })
      return []
    }

    const candidates = this.finalizeRoutes(intent, await this.buildGenericRoutes(intent))
    this.logger.info('planned_routes', {
      intentId: intent.intentId,
      strategyType: intent.strategyType,
      count: candidates.length,
    })
    return candidates
  }

  private async planByStrategy(intent: TradeIntent): Promise<PlannedRoute[]> {
    switch (intent.strategyType) {
      case 'same_exchange_arbitrage':
        return this.buildAtomicRoutes(intent, 'same')

      case 'cross_exchange_arbitrage':
        return this.buildAtomicRoutes(intent, 'distinct')

      case 'cross_chain_execution':
        return this.buildCrossChainRoutes(intent)

      case 'multi_hop_swap':
        return this.buildMultiHopRoutes(intent)

      case 'collateral_swap':
        return this.decorateRoutes(
          intent,
          await this.buildGenericRoutes(intent),
          'collateral_swap_scaffold',
          'Collateral swap planning is scaffolded on top of generic routing; debt-leg modeling is deferred to a later Milestone 7 increment'
        )

      case 'liquidation':
        return this.decorateRoutes(
          intent,
          await this.buildGenericRoutes(intent),
          'liquidation_scaffold',
          'Liquidation planning is scaffolded on top of generic routing; borrower/liquidation-leg modeling is deferred to a later Milestone 7 increment'
        )

      default:
        return intent.requireFlashLiquidity ? [] : this.buildGenericRoutes(intent)
    }
  }

  private async buildGenericRoutes(intent: TradeIntent): Promise<PlannedRoute[]> {
    const candidates: PlannedRoute[] = []

    for (const protocolKey of intent.allowedProtocols) {
      const adapter = this.deps.adapters[protocolKey]
      if (!adapter) continue

      const quotes = await adapter.quote({
        intent,
        candidateProtocols: [],
      })

      for (const quote of quotes) {
        candidates.push(await this.quoteToRoute(intent, quote))
      }
    }

    return candidates
  }

  private async buildAtomicRoutes(intent: TradeIntent, venueMode: AtomicVenueMode = 'any'): Promise<PlannedRoute[]> {
    if (!intent.requireFlashLiquidity) return []
    if (intent.destinationChain && intent.destinationChain !== intent.sourceChain) return []

    const cycleAssets = this.readCycleAssets(intent)
    if (!cycleAssets || cycleAssets[0] !== cycleAssets[2]) return []

    const [borrowAsset, pivotAsset, repayAsset] = cycleAssets
    const flashQuotes = await this.quoteFlashProtocols(intent, borrowAsset, repayAsset)
    if (flashQuotes.length === 0) return []

    const routes: PlannedRoute[] = []
    for (const flashQuote of flashQuotes.slice(0, 2)) {
      const forwardQuotes = await this.quoteSwapProtocols(intent, borrowAsset, pivotAsset, intent.amountIn ?? '0')
      for (const forwardQuote of forwardQuotes.slice(0, 3)) {
        const reverseQuotes = await this.quoteSwapProtocols(intent, pivotAsset, repayAsset, forwardQuote.estimatedAmountOut)
        for (const reverseQuote of reverseQuotes
          .filter((quote) => this.isDistinctLeg(forwardQuote, quote) && this.matchesVenueMode(forwardQuote, quote, venueMode))
          .slice(0, 3)) {
          routes.push(this.buildAtomicCycleRoute(intent, flashQuote, forwardQuote, reverseQuote, cycleAssets))
        }
      }
    }

    return routes
  }

  private async buildStandaloneFlashRoutes(intent: TradeIntent): Promise<PlannedRoute[]> {
    if (!intent.requireFlashLiquidity) return []
    if (intent.destinationChain && intent.destinationChain !== intent.sourceChain) return []

    const borrowAsset = intent.inputAssets[0] ?? intent.outputAssets[0] ?? 'UNKNOWN'
    const flashQuotes = await this.quoteFlashProtocols(intent, borrowAsset, borrowAsset)
    return flashQuotes.map((quote) => this.flashEnvelopeQuoteToRoute(intent, quote))
  }

  private async buildCrossChainRoutes(intent: TradeIntent): Promise<PlannedRoute[]> {
    if (!intent.destinationChain || intent.destinationChain === intent.sourceChain) return []

    const tokenIn = intent.inputAssets[0]
    const tokenOut = intent.outputAssets[0]
    const amountIn = intent.amountIn ?? '0'

    if (!tokenIn || !tokenOut) return []

    const routes: PlannedRoute[] = []
    const bridgeAssets = this.readBridgeAssets(intent, tokenIn, tokenOut)

    for (const bridgeAsset of bridgeAssets.slice(0, 4)) {
      const sourceQuotes =
        bridgeAsset === tokenIn ? [undefined] : await this.quoteSwapProtocols(intent, tokenIn, bridgeAsset, amountIn)

      if (bridgeAsset !== tokenIn && sourceQuotes.length === 0) continue

      for (const sourceQuote of sourceQuotes.slice(0, 3)) {
        const bridgeAmountIn = sourceQuote?.estimatedAmountOut ?? amountIn
        const bridgeQuotes = await this.deps.bridgeRouter.quote({
          sourceChain: intent.sourceChain,
          destinationChain: intent.destinationChain,
          sourceAsset: bridgeAsset,
          destinationAsset: bridgeAsset,
          amountIn: bridgeAmountIn,
          allowedProviders: intent.allowedBridgeProviders,
        })

        for (const bridgeQuote of bridgeQuotes.slice(0, 2)) {
          const destinationQuotes =
            bridgeAsset === tokenOut
              ? [undefined]
              : await this.quoteDestinationSwapProtocols(intent, bridgeAsset, tokenOut, bridgeQuote.estimatedAmountOut)

          if (bridgeAsset !== tokenOut && destinationQuotes.length === 0) continue

          for (const destinationQuote of destinationQuotes.slice(0, 3)) {
            routes.push(this.buildCrossChainRoute(intent, bridgeAsset, sourceQuote, bridgeQuote, destinationQuote))
          }
        }
      }
    }

    return routes
  }

  private async buildMultiHopRoutes(intent: TradeIntent): Promise<PlannedRoute[]> {
    if (intent.destinationChain && intent.destinationChain !== intent.sourceChain) return []

    const tokenIn = intent.inputAssets[0]
    const tokenOut = intent.outputAssets[0]
    const amountIn = intent.amountIn ?? '0'

    if (!tokenIn || !tokenOut || tokenIn === tokenOut) return []

    const routes: PlannedRoute[] = []
    const hopAssets = this.readHopAssets(intent, tokenIn, tokenOut)

    for (const hopAsset of hopAssets.slice(0, 4)) {
      const firstQuotes = await this.quoteSwapProtocols(intent, tokenIn, hopAsset, amountIn)

      for (const firstQuote of firstQuotes.slice(0, 3)) {
        const secondQuotes = await this.quoteSwapProtocols(intent, hopAsset, tokenOut, firstQuote.estimatedAmountOut)

        for (const secondQuote of secondQuotes
          .filter((quote) => this.isDistinctLeg(firstQuote, quote) && quote.protocolKey === firstQuote.protocolKey)
          .slice(0, 3)) {
          routes.push(this.buildMultiHopRoute(intent, hopAsset, firstQuote, secondQuote))
        }
      }
    }

    return routes
  }

  private buildAtomicCycleRoute(
    intent: TradeIntent,
    flashQuote: RouteQuote,
    forwardQuote: RouteQuote,
    reverseQuote: RouteQuote,
    cycleAssets: [string, string, string]
  ): PlannedRoute {
    const [borrowAsset, pivotAsset, repayAsset] = cycleAssets
    const amountIn = intent.amountIn ?? '0'
    const flashFeeBps = flashQuote.flashFeeBps ?? 0
    const amountOwed = addBps(amountIn, flashFeeBps)
    const expectedFinalAmount = reverseQuote.estimatedAmountOut
    const expectedNetAfterRepay = subtractAmounts(expectedFinalAmount, amountOwed)
    const hasRepaymentCoverage = compareAmounts(expectedFinalAmount, amountOwed) >= 0
    const pnlBps = this.relativeBps(expectedNetAfterRepay, amountIn)

    const forwardMeta = (forwardQuote.metadata ?? {}) as Record<string, unknown>
    const reverseMeta = (reverseQuote.metadata ?? {}) as Record<string, unknown>
    const flashMeta = (flashQuote.metadata ?? {}) as Record<string, unknown>

    const totalSwapFeeBps = (forwardQuote.swapFeeBps ?? 0) + (reverseQuote.swapFeeBps ?? 0)
    const totalSlippageBps = (forwardQuote.slippageBps ?? 0) + (reverseQuote.slippageBps ?? 0)
    const totalEstimatedGas = Number(flashQuote.estimatedGas) + Number(forwardQuote.estimatedGas) + Number(reverseQuote.estimatedGas)
    const liquidityScore = Math.min(forwardQuote.liquidityScore ?? 0.5, reverseQuote.liquidityScore ?? 0.5)
    const confidence = Math.min(flashQuote.confidence ?? 0.5, forwardQuote.confidence ?? 0.5, reverseQuote.confidence ?? 0.5)
    const quoteModels = [
      String(flashMeta.quoteModel ?? ''),
      String(forwardMeta.quoteModel ?? ''),
      String(reverseMeta.quoteModel ?? ''),
    ].filter(Boolean)
    const discoveryModes = [
      String(flashMeta.discoveryMode ?? ''),
      String(forwardMeta.discoveryMode ?? ''),
      String(reverseMeta.discoveryMode ?? ''),
    ].filter(Boolean)
    const stateTimestamps = [
      Number(flashMeta.stateTimestampMs ?? 0),
      Number(forwardMeta.stateTimestampMs ?? 0),
      Number(reverseMeta.stateTimestampMs ?? 0),
    ].filter((value) => Number.isFinite(value) && value > 0)

    const venueRelation = forwardQuote.protocolKey === reverseQuote.protocolKey ? 'same_exchange' : 'cross_exchange'
    const { score, scoreBreakdown, rankingReasons } = this.rankRoute({
      expectedPnlUsd: pnlBps / 10,
      flashFeeUsd: flashFeeBps / 100,
      swapFeeUsd: totalSwapFeeBps / 100,
      bridgeFeeUsd: 0,
      gasUsd: totalEstimatedGas * 0.000001,
      slippageRisk: totalSlippageBps / 10000,
      liquidityDepth: liquidityScore,
      repaymentCertainty: hasRepaymentCoverage ? 0.98 : 0.2,
      bridgeCompletionConfidence: 1,
    })

    const warnings = this.uniqueStrings([
      ...this.metadataWarnings(flashMeta),
      ...this.metadataWarnings(forwardMeta),
      ...this.metadataWarnings(reverseMeta),
      ...(!hasRepaymentCoverage ? ['Simulated cycle does not fully cover flash principal plus premium'] : []),
      ...(quoteModels.some((model) => model.startsWith('seeded_') || model.startsWith('deployment_seed'))
        ? ['Route combines at least one seeded quote model; enable RPC for fresher state']
        : []),
    ])

    const protocolKeys = this.uniqueStrings([flashQuote.protocolKey, forwardQuote.protocolKey, reverseQuote.protocolKey])
    const flashProviderAddress = String(
      flashMeta.flashProviderAddress ?? flashMeta.aavePool ?? flashMeta.soloMarginAddress ?? ''
    )
    const borrowAssetAddress = String(flashMeta.borrowAssetAddress ?? borrowAsset)
    const repayAssetAddress = String(flashMeta.borrowAssetAddress ?? borrowAssetAddress)

    return {
      routeId: `${intent.intentId}:${flashQuote.protocolKey}:atomic:${intent.sourceChain}:${forwardQuote.protocolKey}:${String(forwardMeta.poolAddress ?? 'forward')}:${reverseQuote.protocolKey}:${String(reverseMeta.poolAddress ?? 'reverse')}`,
      intentId: intent.intentId,
      sourceChain: intent.sourceChain,
      protocolKeys,
      executionModel: 'same_chain_atomic',
      steps: [
        {
          stepId: `${intent.intentId}:flash`,
          type: 'flash_borrow',
          chainKey: intent.sourceChain,
          protocolKey: flashQuote.protocolKey,
          action: String(flashMeta.routeAction ?? 'flash_borrow'),
          requiresAtomic: true,
          params: {
            borrowAsset,
            borrowAssetAddress,
            amountIn,
            flashProviderAddress,
            callbackType: String(flashMeta.callbackType ?? ''),
            aavePool: String(flashMeta.aavePool ?? ''),
            soloMarginAddress: String(flashMeta.soloMarginAddress ?? ''),
          },
        },
        {
          stepId: `${intent.intentId}:swap:1`,
          type: 'swap',
          chainKey: intent.sourceChain,
          protocolKey: forwardQuote.protocolKey,
          action: String(forwardMeta.routeAction ?? 'swap'),
          requiresAtomic: true,
          params: {
            tokenIn: borrowAsset,
            tokenOut: pivotAsset,
            amountIn,
            estimatedAmountOut: forwardQuote.estimatedAmountOut,
            minAmountOut: forwardQuote.estimatedAmountOut,
            feeTier: Number(forwardMeta.feeTier ?? 0),
            poolAddress: String(forwardMeta.poolAddress ?? ''),
            routerAddress: String(forwardMeta.routerAddress ?? ''),
            slippageBps: forwardQuote.slippageBps ?? 0,
            edgeBps: Number(forwardMeta.edgeBps ?? 0),
          },
        },
        {
          stepId: `${intent.intentId}:swap:2`,
          type: 'swap',
          chainKey: intent.sourceChain,
          protocolKey: reverseQuote.protocolKey,
          action: String(reverseMeta.routeAction ?? 'swap'),
          requiresAtomic: true,
          params: {
            tokenIn: pivotAsset,
            tokenOut: repayAsset,
            amountIn: forwardQuote.estimatedAmountOut,
            estimatedAmountOut: reverseQuote.estimatedAmountOut,
            minAmountOut: reverseQuote.estimatedAmountOut,
            feeTier: Number(reverseMeta.feeTier ?? 0),
            poolAddress: String(reverseMeta.poolAddress ?? ''),
            routerAddress: String(reverseMeta.routerAddress ?? ''),
            slippageBps: reverseQuote.slippageBps ?? 0,
            edgeBps: Number(reverseMeta.edgeBps ?? 0),
          },
        },
        {
          stepId: `${intent.intentId}:repay`,
          type: 'repay',
          chainKey: intent.sourceChain,
          protocolKey: flashQuote.protocolKey,
          action: String(flashMeta.repayAction ?? 'repay_flash_loan'),
          requiresAtomic: true,
          params: {
            repayAsset,
            repayAssetAddress,
            amountOwed,
            expectedFinalAmount,
          },
        },
      ],
      estimatedPnlUsd: pnlBps / 10,
      estimatedGasUsd: totalEstimatedGas * 0.000001,
      score,
      warnings,
      metadata: {
        quoteModel: quoteModels.length > 0 ? quoteModels.join('|') : 'seeded_atomic_cycle',
        discoveryModes: discoveryModes.join('|'),
        stateTimestampMs: stateTimestamps.length > 0 ? Math.min(...stateTimestamps) : undefined,
        deadlineMs: intent.deadlineMs,
        maxSlippageBps: intent.maxSlippageBps,
        strategyType: intent.strategyType,
        routeKind: venueRelation === 'same_exchange' ? 'same_exchange_atomic_cycle' : 'cross_exchange_atomic_cycle',
        venueRelation,
        cycleAssets,
        borrowAsset,
        borrowAssetAddress,
        pivotAsset,
        repayAsset,
        repayAssetAddress,
        borrowAmount: amountIn,
        amountOwed,
        expectedFinalAmount,
        expectedNetAfterRepay,
        flashSourceProtocol: flashQuote.protocolKey,
        flashProviderAddress,
        flashMethod: String(flashMeta.flashMethod ?? 'flashLoanSimple'),
        callbackType: String(flashMeta.callbackType ?? ''),
        aavePool: String(flashMeta.aavePool ?? ''),
        reserveState: flashMeta.reserveState,
        receiverAddress: String(flashMeta.receiverAddress ?? '{{AAVE_RECEIVER}}'),
        soloMarginAddress: String(flashMeta.soloMarginAddress ?? ''),
        marketId: flashMeta.marketId,
        routeExecutorAddress: String(
          flashMeta.routeExecutorAddress ?? forwardMeta.routeExecutorAddress ?? reverseMeta.routeExecutorAddress ?? '{{ROUTE_EXECUTOR}}'
        ),
        swapLiquidityScore: liquidityScore,
        confidence,
        pnlBps,
        totalSwapFeeBps,
        totalSlippageBps,
        forwardPool: String(forwardMeta.poolAddress ?? ''),
        reversePool: String(reverseMeta.poolAddress ?? ''),
        forwardProtocol: forwardQuote.protocolKey,
        reverseProtocol: reverseQuote.protocolKey,
        scoreBreakdown,
        rankingReasons,
      },
    }
  }

  private flashEnvelopeQuoteToRoute(intent: TradeIntent, quote: RouteQuote): PlannedRoute {
    const metadata = (quote.metadata ?? {}) as Record<string, unknown>
    const borrowAsset = String(metadata.borrowAsset ?? intent.inputAssets[0] ?? intent.outputAssets[0] ?? 'UNKNOWN')
    const borrowAssetAddress = String(metadata.borrowAssetAddress ?? borrowAsset)
    const borrowAmount = String(metadata.borrowAmount ?? intent.amountIn ?? '0')
    const amountOwed = addBps(borrowAmount, quote.flashFeeBps ?? 0)
    const { score, scoreBreakdown, rankingReasons } = this.rankRoute({
      expectedPnlUsd: 0,
      flashFeeUsd: (quote.flashFeeBps ?? 0) / 100,
      swapFeeUsd: 0,
      bridgeFeeUsd: 0,
      gasUsd: Number(quote.estimatedGas) * 0.000001,
      slippageRisk: 0,
      liquidityDepth: quote.liquidityScore ?? 0.5,
      repaymentCertainty: quote.confidence ?? 0.5,
      bridgeCompletionConfidence: 1,
    })

    return {
      routeId: `${quote.routeId}:flash_envelope`,
      intentId: intent.intentId,
      sourceChain: intent.sourceChain,
      protocolKeys: [quote.protocolKey],
      executionModel: 'same_chain_atomic',
      steps: [
        {
          stepId: `${quote.routeId}:flash`,
          type: 'flash_borrow',
          chainKey: intent.sourceChain,
          protocolKey: quote.protocolKey,
          action: String(metadata.routeAction ?? 'flash_borrow'),
          requiresAtomic: true,
          params: {
            borrowAsset,
            borrowAssetAddress,
            amountIn: borrowAmount,
            callbackType: String(metadata.callbackType ?? ''),
            flashProviderAddress: String(metadata.flashProviderAddress ?? ''),
          },
        },
        {
          stepId: `${quote.routeId}:repay`,
          type: 'repay',
          chainKey: intent.sourceChain,
          protocolKey: quote.protocolKey,
          action: String(metadata.repayAction ?? 'repay_flash_loan'),
          requiresAtomic: true,
          params: {
            repayAsset: borrowAsset,
            repayAssetAddress: borrowAssetAddress,
            amountOwed,
            expectedFinalAmount: amountOwed,
          },
        },
      ],
      estimatedPnlUsd: 0,
      estimatedGasUsd: Number(quote.estimatedGas) * 0.000001,
      score,
      warnings: this.uniqueStrings([
        ...this.metadataWarnings(metadata),
        'Standalone flash envelope route contains no swap legs; compose downstream steps before live execution',
      ]),
      metadata: {
        ...(quote.metadata ?? {}),
        deadlineMs: intent.deadlineMs,
        maxSlippageBps: intent.maxSlippageBps,
        strategyType: intent.strategyType,
        routeKind: 'flash_envelope',
        borrowAsset,
        borrowAssetAddress,
        borrowAmount,
        amountOwed,
        expectedFinalAmount: amountOwed,
        expectedNetAfterRepay: '0',
        swapLiquidityScore: quote.liquidityScore ?? 0.5,
        confidence: quote.confidence ?? 0.5,
        flashSourceProtocol: quote.protocolKey,
        flashProviderAddress: String(metadata.flashProviderAddress ?? ''),
        quoteModel: quote.metadata?.quoteModel ?? 'flash_envelope_quote',
        scoreBreakdown,
        rankingReasons,
      },
    }
  }

  private async quoteToRoute(intent: TradeIntent, quote: RouteQuote): Promise<PlannedRoute> {
    if (quote.metadata?.routeTemplate === 'flash_envelope') {
      return this.flashEnvelopeQuoteToRoute(intent, quote)
    }

    const metadata = (quote.metadata ?? {}) as Record<string, unknown>
    const isCrossChain = Boolean(intent.destinationChain && intent.destinationChain !== intent.sourceChain)

    const bridgeQuotes = isCrossChain
      ? await this.deps.bridgeRouter.quote({
          sourceChain: intent.sourceChain,
          destinationChain: intent.destinationChain!,
          sourceAsset: String(metadata.tokenOut ?? intent.inputAssets[0] ?? 'UNKNOWN'),
          destinationAsset: intent.outputAssets[0] ?? 'UNKNOWN',
          amountIn: quote.estimatedAmountOut,
          allowedProviders: intent.allowedBridgeProviders,
        })
      : []

    const bridgeQuote = bridgeQuotes[0]
    const bridgeValidation = bridgeQuote ? this.deps.bridgeRouter.validate(bridgeQuote, this.maxBridgeTimeSec(intent)) : undefined
    const bridgeCompletionConfidence = !bridgeQuote
      ? 1
      : bridgeValidation?.valid
        ? bridgeQuote.requiresManualRedeem
          ? 0.65
          : 0.86
        : 0.55

    const { score, scoreBreakdown, rankingReasons } = this.rankRoute({
      expectedPnlUsd: (quote.liquidityScore ?? 0.5) * 20,
      flashFeeUsd: (quote.flashFeeBps ?? 0) / 100,
      swapFeeUsd: (quote.swapFeeBps ?? 0) / 100,
      bridgeFeeUsd: bridgeQuote ? this.quoteLossBps(bridgeQuote.amountIn, bridgeQuote.estimatedAmountOut) / 100 : 0,
      gasUsd: Number(quote.estimatedGas) * 0.000001,
      slippageRisk: (quote.slippageBps ?? 10) / 10000,
      liquidityDepth: quote.liquidityScore ?? 0.5,
      repaymentCertainty: quote.confidence ?? 0.5,
      bridgeCompletionConfidence,
    })

    const action = String(metadata.routeAction ?? 'swap')

    return {
      routeId: quote.routeId,
      intentId: intent.intentId,
      sourceChain: intent.sourceChain,
      destinationChain: intent.destinationChain,
      protocolKeys: [quote.protocolKey, ...(bridgeQuote ? [bridgeQuote.provider] : [])],
      executionModel: isCrossChain ? 'cross_chain_staged' : 'same_chain_atomic',
      steps: [
        {
          stepId: `${quote.routeId}:step:1`,
          type: 'swap',
          chainKey: intent.sourceChain,
          protocolKey: quote.protocolKey,
          action,
          requiresAtomic: !isCrossChain,
          params: {
            tokenIn: intent.inputAssets[0] ?? 'UNKNOWN',
            tokenOut: intent.outputAssets[0] ?? 'UNKNOWN',
            amountIn: intent.amountIn ?? '0',
            estimatedAmountOut: quote.estimatedAmountOut,
            minAmountOut: quote.estimatedAmountOut,
            feeTier: Number(metadata.feeTier ?? 0),
            poolAddress: String(metadata.poolAddress ?? ''),
            routerAddress: String(metadata.routerAddress ?? ''),
            slippageBps: quote.slippageBps ?? 0,
          },
        },
        ...(bridgeQuote
          ? [
              {
                stepId: `${quote.routeId}:bridge`,
                type: 'bridge' as const,
                chainKey: intent.sourceChain,
                protocolKey: bridgeQuote.provider,
                action: 'bridge_transfer',
                requiresAtomic: false,
                params: {
                  sourceChain: bridgeQuote.sourceChain,
                  destinationChain: bridgeQuote.destinationChain,
                  provider: bridgeQuote.provider,
                  sourceAsset: bridgeQuote.sourceAsset,
                  destinationAsset: bridgeQuote.destinationAsset,
                  amountIn: bridgeQuote.amountIn,
                  estimatedAmountOut: bridgeQuote.estimatedAmountOut,
                  estimatedTimeSec: bridgeQuote.estimatedTimeSec,
                  requiresManualRedeem: bridgeQuote.requiresManualRedeem,
                  gasTokenRequired: bridgeQuote.gasTokenRequired,
                },
              },
            ]
          : []),
      ],
      estimatedPnlUsd: (quote.liquidityScore ?? 0.5) * 20,
      estimatedGasUsd: Number(quote.estimatedGas) * 0.000001,
      estimatedBridgeTimeSec: bridgeQuote?.estimatedTimeSec,
      score,
      warnings: this.uniqueStrings([
        ...this.metadataWarnings(metadata),
        ...(bridgeQuote?.warnings ?? []),
        ...(bridgeValidation?.reasons ?? []),
        ...(isCrossChain
          ? ['Cross-chain route is staged only; bridge settlement and destination execution remain planner-level until later milestones']
          : []),
      ]),
      metadata: {
        ...metadata,
        deadlineMs: intent.deadlineMs,
        maxSlippageBps: intent.maxSlippageBps,
        strategyType: intent.strategyType,
        routeKind: isCrossChain ? 'cross_chain_scaffold' : 'single_protocol',
        plannerOnly: isCrossChain || undefined,
        quoteModel: metadata.quoteModel ?? 'single_protocol_quote',
        liquidityScore: quote.liquidityScore,
        confidence: quote.confidence,
        bridgeProvider: bridgeQuote?.provider,
        bridgeValidation,
        scoreBreakdown,
        rankingReasons,
      },
    }
  }

  private buildCrossChainRoute(
    intent: TradeIntent,
    bridgeAsset: string,
    sourceQuote: RouteQuote | undefined,
    bridgeQuote: BridgeQuote,
    destinationQuote?: RouteQuote
  ): PlannedRoute {
    const sourceMeta = (sourceQuote?.metadata ?? {}) as Record<string, unknown>
    const destinationMeta = (destinationQuote?.metadata ?? {}) as Record<string, unknown>
    const bridgeValidation = this.deps.bridgeRouter.validate(bridgeQuote, this.maxBridgeTimeSec(intent))
    const bridgeLossBps = this.quoteLossBps(bridgeQuote.amountIn, bridgeQuote.estimatedAmountOut)

    const totalSwapFeeBps = (sourceQuote?.swapFeeBps ?? 0) + (destinationQuote?.swapFeeBps ?? 0)
    const totalSlippageBps = (sourceQuote?.slippageBps ?? 0) + (destinationQuote?.slippageBps ?? 0)
    const totalEstimatedGas =
      Number(sourceQuote?.estimatedGas ?? 0) +
      Number(destinationQuote?.estimatedGas ?? 0) +
      this.bridgeGasEstimate(bridgeQuote.provider)

    const sourceLiquidity = sourceQuote?.liquidityScore ?? 0.95
    const destinationLiquidity = destinationQuote?.liquidityScore ?? 0.95
    const liquidityScore = Math.min(sourceLiquidity, destinationLiquidity)

    const sourceConfidence = sourceQuote?.confidence ?? 0.9
    const destinationConfidence = destinationQuote?.confidence ?? 0.9
    const routeConfidence = Math.min(sourceConfidence, destinationConfidence)

    const bridgeCompletionConfidence = bridgeValidation.valid
      ? bridgeQuote.requiresManualRedeem
        ? 0.65
        : 0.88
      : 0.5

    const routeUtilityUsd = (sourceLiquidity + destinationLiquidity) * 10

    const { score, scoreBreakdown, rankingReasons } = this.rankRoute({
      expectedPnlUsd: routeUtilityUsd,
      flashFeeUsd: 0,
      swapFeeUsd: totalSwapFeeBps / 100,
      bridgeFeeUsd: bridgeLossBps / 100,
      gasUsd: totalEstimatedGas * 0.000001,
      slippageRisk: totalSlippageBps / 10000,
      liquidityDepth: liquidityScore,
      repaymentCertainty: routeConfidence,
      bridgeCompletionConfidence,
    })

    const quoteModels = [String(sourceMeta.quoteModel ?? ''), String(destinationMeta.quoteModel ?? '')].filter(Boolean)
    const discoveryModes = [String(sourceMeta.discoveryMode ?? ''), String(destinationMeta.discoveryMode ?? '')].filter(Boolean)
    const stateTimestamps = [
      Number(sourceMeta.stateTimestampMs ?? 0),
      Number(destinationMeta.stateTimestampMs ?? 0),
    ].filter((value) => Number.isFinite(value) && value > 0)

    const warnings = this.uniqueStrings([
      ...this.metadataWarnings(sourceMeta),
      ...this.metadataWarnings(destinationMeta),
      ...bridgeQuote.warnings,
      ...bridgeValidation.reasons,
      ...(!sourceQuote ? ['Cross-chain route bridges the input asset directly from the source chain'] : []),
      ...(!destinationQuote ? ['Cross-chain route bridges directly into the requested destination asset'] : []),
      'Cross-chain route is staged only; bridge settlement and destination execution remain planner-level until later milestones',
      ...(quoteModels.some((model) => model.startsWith('seeded_') || model.startsWith('deployment_seed'))
        ? ['Cross-chain route includes seeded quote models; enable live RPC for fresher state']
        : []),
    ])

    const steps: PlannedRoute['steps'] = []

    if (sourceQuote) {
      steps.push({
        stepId: `${intent.intentId}:source-swap`,
        type: 'swap',
        chainKey: intent.sourceChain,
        protocolKey: sourceQuote.protocolKey,
        action: String(sourceMeta.routeAction ?? 'swap'),
        requiresAtomic: false,
        params: {
          tokenIn: intent.inputAssets[0] ?? 'UNKNOWN',
          tokenOut: bridgeAsset,
          amountIn: intent.amountIn ?? '0',
          estimatedAmountOut: sourceQuote.estimatedAmountOut,
          minAmountOut: sourceQuote.estimatedAmountOut,
          feeTier: Number(sourceMeta.feeTier ?? 0),
          poolAddress: String(sourceMeta.poolAddress ?? ''),
          routerAddress: String(sourceMeta.routerAddress ?? ''),
          slippageBps: sourceQuote.slippageBps ?? 0,
        },
      })
    }

    steps.push({
      stepId: `${intent.intentId}:bridge`,
      type: 'bridge',
      chainKey: intent.sourceChain,
      protocolKey: bridgeQuote.provider,
      action: 'bridge_transfer',
      requiresAtomic: false,
      params: {
        sourceChain: bridgeQuote.sourceChain,
        destinationChain: bridgeQuote.destinationChain,
        provider: bridgeQuote.provider,
        sourceAsset: bridgeQuote.sourceAsset,
        destinationAsset: bridgeQuote.destinationAsset,
        amountIn: bridgeQuote.amountIn,
        estimatedAmountOut: bridgeQuote.estimatedAmountOut,
        estimatedTimeSec: bridgeQuote.estimatedTimeSec,
        requiresManualRedeem: bridgeQuote.requiresManualRedeem,
        gasTokenRequired: bridgeQuote.gasTokenRequired,
      },
    })

    if (destinationQuote) {
      steps.push({
        stepId: `${intent.intentId}:destination-swap`,
        type: 'swap',
        chainKey: intent.destinationChain!,
        protocolKey: destinationQuote.protocolKey,
        action: String(destinationMeta.routeAction ?? 'swap'),
        requiresAtomic: false,
        params: {
          tokenIn: bridgeAsset,
          tokenOut: intent.outputAssets[0] ?? 'UNKNOWN',
          amountIn: bridgeQuote.estimatedAmountOut,
          estimatedAmountOut: destinationQuote.estimatedAmountOut,
          minAmountOut: destinationQuote.estimatedAmountOut,
          feeTier: Number(destinationMeta.feeTier ?? 0),
          poolAddress: String(destinationMeta.poolAddress ?? ''),
          routerAddress: String(destinationMeta.routerAddress ?? ''),
          slippageBps: destinationQuote.slippageBps ?? 0,
        },
      })
    }

    return {
      routeId: `${intent.intentId}:cross_chain:${intent.sourceChain}:${intent.destinationChain}:${sourceQuote?.protocolKey ?? 'direct'}:${bridgeQuote.provider}:${destinationQuote?.protocolKey ?? 'bridge_only'}`,
      intentId: intent.intentId,
      sourceChain: intent.sourceChain,
      destinationChain: intent.destinationChain,
      protocolKeys: this.uniqueStrings([
        ...(sourceQuote ? [sourceQuote.protocolKey] : []),
        bridgeQuote.provider,
        ...(destinationQuote ? [destinationQuote.protocolKey] : []),
      ]),
      executionModel: 'cross_chain_staged',
      steps,
      estimatedPnlUsd: routeUtilityUsd,
      estimatedGasUsd: totalEstimatedGas * 0.000001,
      estimatedBridgeTimeSec: bridgeQuote.estimatedTimeSec,
      score,
      warnings,
      metadata: {
        deadlineMs: intent.deadlineMs,
        maxSlippageBps: intent.maxSlippageBps,
        strategyType: intent.strategyType,
        routeKind: 'cross_chain_staged',
        plannerOnly: true,
        bridgeAsset,
        bridgeProvider: bridgeQuote.provider,
        bridgeValidation,
        bridgeRequiresManualRedeem: bridgeQuote.requiresManualRedeem,
        bridgeGasTokenRequired: bridgeQuote.gasTokenRequired,
        bridgeEstimatedAmountOut: bridgeQuote.estimatedAmountOut,
        sourceLegPresent: Boolean(sourceQuote),
        destinationLegPresent: Boolean(destinationQuote),
        sourceProtocol: sourceQuote?.protocolKey,
        destinationProtocol: destinationQuote?.protocolKey,
        sourceQuoteModel: sourceQuote ? String(sourceMeta.quoteModel ?? '') : 'identity_source_leg',
        destinationQuoteModel: destinationQuote ? String(destinationMeta.quoteModel ?? '') : 'identity_destination_leg',
        quoteModel: quoteModels.length > 0 ? quoteModels.join('|') : 'cross_chain_staged_route',
        discoveryModes: discoveryModes.join('|'),
        stateTimestampMs: stateTimestamps.length > 0 ? Math.min(...stateTimestamps) : undefined,
        swapLiquidityScore: liquidityScore,
        confidence: routeConfidence,
        totalSwapFeeBps,
        totalSlippageBps,
        scoreBreakdown,
        rankingReasons,
      },
    }
  }

  private buildMultiHopRoute(intent: TradeIntent, hopAsset: string, firstQuote: RouteQuote, secondQuote: RouteQuote): PlannedRoute {
    const firstMeta = (firstQuote.metadata ?? {}) as Record<string, unknown>
    const secondMeta = (secondQuote.metadata ?? {}) as Record<string, unknown>

    const totalSwapFeeBps = (firstQuote.swapFeeBps ?? 0) + (secondQuote.swapFeeBps ?? 0)
    const totalSlippageBps = (firstQuote.slippageBps ?? 0) + (secondQuote.slippageBps ?? 0)
    const totalEstimatedGas = Number(firstQuote.estimatedGas) + Number(secondQuote.estimatedGas)

    const liquidityScore = Math.min(firstQuote.liquidityScore ?? 0.5, secondQuote.liquidityScore ?? 0.5)
    const confidence = Math.min(firstQuote.confidence ?? 0.5, secondQuote.confidence ?? 0.5)
    const routeUtilityUsd = ((firstQuote.liquidityScore ?? 0.5) + (secondQuote.liquidityScore ?? 0.5)) * 10

    const { score, scoreBreakdown, rankingReasons } = this.rankRoute({
      expectedPnlUsd: routeUtilityUsd,
      flashFeeUsd: 0,
      swapFeeUsd: totalSwapFeeBps / 100,
      bridgeFeeUsd: 0,
      gasUsd: totalEstimatedGas * 0.000001,
      slippageRisk: totalSlippageBps / 10000,
      liquidityDepth: liquidityScore,
      repaymentCertainty: confidence,
      bridgeCompletionConfidence: 1,
    })

    const quoteModels = [String(firstMeta.quoteModel ?? ''), String(secondMeta.quoteModel ?? '')].filter(Boolean)
    const discoveryModes = [String(firstMeta.discoveryMode ?? ''), String(secondMeta.discoveryMode ?? '')].filter(Boolean)
    const stateTimestamps = [Number(firstMeta.stateTimestampMs ?? 0), Number(secondMeta.stateTimestampMs ?? 0)].filter(
      (value) => Number.isFinite(value) && value > 0
    )

    const warnings = this.uniqueStrings([
      ...this.metadataWarnings(firstMeta),
      ...this.metadataWarnings(secondMeta),
      ...(quoteModels.some((model) => model.startsWith('seeded_') || model.startsWith('deployment_seed'))
        ? ['Multi-hop route includes seeded quote models; enable live RPC for fresher state']
        : []),
    ])

    return {
      routeId: `${intent.intentId}:${firstQuote.protocolKey}:multi_hop:${intent.sourceChain}:${hopAsset}:${String(firstMeta.poolAddress ?? 'first')}:${String(secondMeta.poolAddress ?? 'second')}`,
      intentId: intent.intentId,
      sourceChain: intent.sourceChain,
      protocolKeys: this.uniqueStrings([firstQuote.protocolKey, secondQuote.protocolKey]),
      executionModel: 'same_chain_atomic',
      steps: [
        {
          stepId: `${intent.intentId}:swap:1`,
          type: 'swap',
          chainKey: intent.sourceChain,
          protocolKey: firstQuote.protocolKey,
          action: String(firstMeta.routeAction ?? 'swap'),
          requiresAtomic: true,
          params: {
            tokenIn: intent.inputAssets[0] ?? 'UNKNOWN',
            tokenOut: hopAsset,
            amountIn: intent.amountIn ?? '0',
            estimatedAmountOut: firstQuote.estimatedAmountOut,
            minAmountOut: firstQuote.estimatedAmountOut,
            feeTier: Number(firstMeta.feeTier ?? 0),
            poolAddress: String(firstMeta.poolAddress ?? ''),
            routerAddress: String(firstMeta.routerAddress ?? ''),
            slippageBps: firstQuote.slippageBps ?? 0,
          },
        },
        {
          stepId: `${intent.intentId}:swap:2`,
          type: 'swap',
          chainKey: intent.sourceChain,
          protocolKey: secondQuote.protocolKey,
          action: String(secondMeta.routeAction ?? 'swap'),
          requiresAtomic: true,
          params: {
            tokenIn: hopAsset,
            tokenOut: intent.outputAssets[0] ?? 'UNKNOWN',
            amountIn: firstQuote.estimatedAmountOut,
            estimatedAmountOut: secondQuote.estimatedAmountOut,
            minAmountOut: secondQuote.estimatedAmountOut,
            feeTier: Number(secondMeta.feeTier ?? 0),
            poolAddress: String(secondMeta.poolAddress ?? ''),
            routerAddress: String(secondMeta.routerAddress ?? ''),
            slippageBps: secondQuote.slippageBps ?? 0,
          },
        },
      ],
      estimatedPnlUsd: routeUtilityUsd,
      estimatedGasUsd: totalEstimatedGas * 0.000001,
      score,
      warnings,
      metadata: {
        deadlineMs: intent.deadlineMs,
        maxSlippageBps: intent.maxSlippageBps,
        strategyType: intent.strategyType,
        routeKind: 'multi_hop_two_leg',
        hopAsset,
        multiHopLegs: 2,
        quoteModel: quoteModels.length > 0 ? quoteModels.join('|') : 'multi_hop_two_leg',
        discoveryModes: discoveryModes.join('|'),
        stateTimestampMs: stateTimestamps.length > 0 ? Math.min(...stateTimestamps) : undefined,
        swapLiquidityScore: liquidityScore,
        confidence,
        totalSwapFeeBps,
        totalSlippageBps,
        scoreBreakdown,
        rankingReasons,
      },
    }
  }

  private decorateRoutes(intent: TradeIntent, routes: PlannedRoute[], routeKind: string, warning: string): PlannedRoute[] {
    return routes.map((route) => ({
      ...route,
      warnings: this.uniqueStrings([...route.warnings, warning]),
      metadata: {
        ...(route.metadata ?? {}),
        strategyType: intent.strategyType,
        routeKind,
      },
    }))
  }

  private finalizeRoutes(intent: TradeIntent, routes: PlannedRoute[]): PlannedRoute[] {
    const ranked = this.dedupeRoutes(routes).sort((a, b) => b.score - a.score)

    return ranked.map((route, index) => ({
      ...route,
      metadata: {
        ...(route.metadata ?? {}),
        strategyType: intent.strategyType,
        plannerRank: index + 1,
        plannerCandidateCount: ranked.length,
        plannerMilestone: 7,
      },
    }))
  }

  private dedupeRoutes(routes: PlannedRoute[]): PlannedRoute[] {
    const deduped = new Map<string, PlannedRoute>()

    for (const route of routes) {
      const key = this.routeSignature(route)
      const current = deduped.get(key)
      if (!current || route.score > current.score) {
        deduped.set(key, route)
      }
    }

    return [...deduped.values()]
  }

  private routeSignature(route: PlannedRoute): string {
    const steps = route.steps.map((step) =>
      [
        step.chainKey,
        step.protocolKey,
        step.type,
        step.action,
        String(step.params.poolAddress ?? step.params.routerAddress ?? step.params.provider ?? ''),
        String(step.params.tokenIn ?? step.params.borrowAsset ?? ''),
        String(step.params.tokenOut ?? step.params.repayAsset ?? ''),
      ].join(':')
    )

    return [route.executionModel ?? '', route.sourceChain, route.destinationChain ?? '', ...steps].join('|')
  }

  private matchesVenueMode(left: RouteQuote, right: RouteQuote, mode: AtomicVenueMode): boolean {
    if (mode === 'same') return left.protocolKey === right.protocolKey
    if (mode === 'distinct') return left.protocolKey !== right.protocolKey
    return true
  }

  private canFallbackToStandaloneFlash(intent: TradeIntent): boolean {
    const allowed = intent.allowedProtocols.filter(Boolean)
    if (allowed.length === 0) return false
    return !allowed.some((key) => SWAP_PROTOCOLS.has(key))
  }

  private rankRoute(input: RouteScoreInput): { score: number; scoreBreakdown: RouteScoreBreakdown; rankingReasons: string[] } {
    const scoreBreakdown = scoreRouteDetailed(input)
    return {
      score: scoreBreakdown.total,
      scoreBreakdown,
      rankingReasons: this.rankingReasons(scoreBreakdown),
    }
  }

  private rankingReasons(breakdown: RouteScoreBreakdown): string[] {
    return this.uniqueStrings([
      ...breakdown.positiveFactors.slice(0, 2),
      ...breakdown.negativeFactors.slice(0, 2).map((reason) => `Caution: ${reason}`),
      ...breakdown.penaltiesApplied.map((reason) => `Penalty: ${reason}`),
    ]).slice(0, 6)
  }

  private async quoteFlashProtocols(intent: TradeIntent, borrowAsset: string, repayAsset: string): Promise<RouteQuote[]> {
    const quotes: RouteQuote[] = []
    for (const protocolKey of intent.allowedProtocols.filter((key) => FLASH_PROTOCOLS.has(key))) {
      const adapter = this.deps.adapters[protocolKey]
      if (!adapter) continue
      try {
        const next = await adapter.quote({
          intent: {
            ...intent,
            destinationChain: undefined,
            inputAssets: [borrowAsset],
            outputAssets: [repayAsset],
          },
          candidateProtocols: [],
        })
        quotes.push(...next)
      } catch {
        continue
      }
    }
    return quotes.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
  }

  private async quoteSwapProtocols(intent: TradeIntent, tokenIn: string, tokenOut: string, amountIn: string): Promise<RouteQuote[]> {
    const quotes: RouteQuote[] = []
    for (const protocolKey of intent.allowedProtocols.filter((key) => SWAP_PROTOCOLS.has(key))) {
      const adapter = this.deps.adapters[protocolKey]
      if (!adapter) continue
      try {
        const next = await adapter.quote({
          intent: {
            ...intent,
            destinationChain: undefined,
            requireFlashLiquidity: false,
            inputAssets: [tokenIn],
            outputAssets: [tokenOut],
            amountIn,
          },
          candidateProtocols: [],
        })
        quotes.push(...next)
      } catch {
        continue
      }
    }
    return quotes.sort(
      (a, b) =>
        (b.liquidityScore ?? 0) - (a.liquidityScore ?? 0) ||
        (b.confidence ?? 0) - (a.confidence ?? 0)
    )
  }

  private async quoteDestinationSwapProtocols(
    intent: TradeIntent,
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<RouteQuote[]> {
    if (!intent.destinationChain) return []

    const quotes: RouteQuote[] = []

    for (const protocolKey of intent.allowedProtocols.filter((key) => SWAP_PROTOCOLS.has(key))) {
      const adapter = this.deps.adapters[protocolKey]
      if (!adapter) continue

      try {
        const next = await adapter.quote({
          intent: {
            ...intent,
            sourceChain: intent.destinationChain,
            destinationChain: undefined,
            requireFlashLiquidity: false,
            inputAssets: [tokenIn],
            outputAssets: [tokenOut],
            amountIn,
          },
          candidateProtocols: [],
        })

        quotes.push(...next)
      } catch {
        continue
      }
    }

    return quotes.sort(
      (a, b) =>
        (b.liquidityScore ?? 0) - (a.liquidityScore ?? 0) ||
        (b.confidence ?? 0) - (a.confidence ?? 0)
    )
  }

  private readCycleAssets(intent: TradeIntent): [string, string, string] | undefined {
    const raw = intent.metadata?.cycleAssets
    if (!Array.isArray(raw)) return undefined
    const cycleAssets = raw.filter((value): value is string => typeof value === 'string')
    if (cycleAssets.length !== 3) return undefined
    return [cycleAssets[0], cycleAssets[1], cycleAssets[2]]
  }

  private readBridgeAssets(intent: TradeIntent, tokenIn: string, tokenOut: string): string[] {
    const rawBridgeAssets = intent.metadata?.bridgeAssets
    const explicitBridgeAssets = Array.isArray(rawBridgeAssets)
      ? rawBridgeAssets.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : []

    const singleBridgeAsset =
      typeof intent.metadata?.bridgeAsset === 'string' && intent.metadata.bridgeAsset.trim().length > 0
        ? [intent.metadata.bridgeAsset]
        : []

    const explicit = this.uniqueStrings([...explicitBridgeAssets, ...singleBridgeAsset])
    if (explicit.length > 0) return explicit

    return this.uniqueStrings([tokenIn, tokenOut, 'WETH', 'USDC', 'USDT', 'DAI'])
  }

  private readHopAssets(intent: TradeIntent, tokenIn: string, tokenOut: string): string[] {
    const rawHopAssets = intent.metadata?.hopAssets
    const explicitHopAssets = Array.isArray(rawHopAssets)
      ? rawHopAssets.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : []

    return this.uniqueStrings([...explicitHopAssets, 'WETH', 'USDC', 'USDT', 'DAI']).filter(
      (asset) => asset !== tokenIn && asset !== tokenOut
    )
  }

  private maxBridgeTimeSec(intent: TradeIntent): number {
    const candidate = Number(intent.metadata?.maxBridgeTimeSec ?? 900)
    return Number.isFinite(candidate) && candidate > 0 ? candidate : 900
  }

  private bridgeGasEstimate(provider: string): number {
    switch (provider) {
      case 'across':
        return 160_000
      case 'debridge':
        return 185_000
      case 'meson':
        return 190_000
      case 'stargate':
        return 220_000
      case 'cbridge':
        return 210_000
      case 'layerzero':
        return 240_000
      case 'wormhole':
        return 260_000
      default:
        return 220_000
    }
  }

  private metadataWarnings(metadata: Record<string, unknown>): string[] {
    return Array.isArray(metadata.warnings)
      ? metadata.warnings.filter((value): value is string => typeof value === 'string')
      : []
  }

  private isDistinctLeg(left: RouteQuote, right: RouteQuote): boolean {
    if (left.protocolKey !== right.protocolKey) return true

    const leftMeta = (left.metadata ?? {}) as Record<string, unknown>
    const rightMeta = (right.metadata ?? {}) as Record<string, unknown>

    const leftTokenIn = String(leftMeta.tokenIn ?? '')
    const leftTokenOut = String(leftMeta.tokenOut ?? '')
    const rightTokenIn = String(rightMeta.tokenIn ?? '')
    const rightTokenOut = String(rightMeta.tokenOut ?? '')

    if (leftTokenIn && leftTokenOut && rightTokenIn && rightTokenOut) {
      if (leftTokenIn === rightTokenOut && leftTokenOut === rightTokenIn) return true
      if (leftTokenIn !== rightTokenIn || leftTokenOut !== rightTokenOut) return true
    }

    const leftPool = String(leftMeta.poolAddress ?? '')
    const rightPool = String(rightMeta.poolAddress ?? '')
    if (leftPool && rightPool && leftPool !== rightPool) return true

    return left.routeId !== right.routeId
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))]
  }

  private relativeBps(delta: string, baseAmount: string): number {
    const denominator = safeBigInt(baseAmount)
    if (denominator === 0n) return 0
    return Number((safeBigInt(delta) * 10_000n) / denominator)
  }

  private quoteLossBps(amountIn: string, amountOut: string): number {
    const input = safeBigInt(amountIn)
    const output = safeBigInt(amountOut)

    if (input === 0n || output >= input) return 0
    return Number(((input - output) * 10_000n) / input)
  }
}

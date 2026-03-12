import type { ExecutionPayload, PlannedRoute, RouteInput, RouteQuote, ValidationResult } from '@mde/domain'
import { BaseAdapter } from '../adapter.js'
import {
  decodeCalldataEnvelope,
  encodeSwapPlanCall,
  ROUTE_EXECUTOR_SELECTORS,
  toExecutionDeadlineSeconds,
  type ExecutorStepPlan,
} from '../executor-encoding.js'
import {
  quoteUniswapV3Live,
  resolveIntentAssetAddressBook,
  type JsonRpcTransport,
} from '../discovery/index.js'
import { directionForPool, findDirectPools } from '../seeds/uniswap-v3-pools.js'
import { applyBpsDelta } from '../utils.js'

type UniswapV3AdapterOptions = {
  routerAddress?: string
  routeExecutorAddress?: string
  transportFactory?: (chainKey: string) => JsonRpcTransport | undefined
}

const DEFAULT_UNISWAP_ROUTER = '{{UNISWAP_V3_ROUTER}}'
const DEFAULT_ROUTE_EXECUTOR = '{{ROUTE_EXECUTOR}}'

export class UniswapV3Adapter extends BaseAdapter {
  readonly protocolKey = 'uniswap_v3' as const

  private readonly routerAddress: string
  private readonly routeExecutorAddress: string
  private readonly transportFactory?: (chainKey: string) => JsonRpcTransport | undefined

  constructor(options: UniswapV3AdapterOptions = {}) {
    super()
    this.routerAddress = options.routerAddress ?? DEFAULT_UNISWAP_ROUTER
    this.routeExecutorAddress = options.routeExecutorAddress ?? DEFAULT_ROUTE_EXECUTOR
    this.transportFactory = options.transportFactory
  }

  async quote(routeInput: RouteInput): Promise<RouteQuote[]> {
    const liveQuotes = await this.tryLiveQuotes(routeInput)
    if (liveQuotes.length > 0) {
      return liveQuotes.map((quote) => ({
        ...quote,
        metadata: {
          ...(quote.metadata ?? {}),
          routerAddress: String(quote.metadata?.routerAddress ?? this.routerAddress),
          routeExecutorAddress: this.routeExecutorAddress,
          routeAction: 'exact_input_single',
        },
      }))
    }

    const { intent } = routeInput
    const tokenIn = intent.inputAssets[0]
    const tokenOut = intent.outputAssets[0]
    const amountIn = intent.amountIn ?? '0'

    if (!tokenIn || !tokenOut || tokenIn === tokenOut) return []

    return findDirectPools(intent.sourceChain, tokenIn, tokenOut).map((pool) => {
      const feeBps = Math.round(pool.feeTier / 100)
      const direction = directionForPool(pool, tokenIn)
      const edgeBps = direction === 'zeroForOne' ? pool.zeroForOneEdgeBps : pool.oneForZeroEdgeBps
      const netDeltaBps = edgeBps - feeBps - pool.priceImpactBps
      const estimatedAmountOut = applyBpsDelta(amountIn, netDeltaBps)

      return {
        routeId: `${intent.intentId}:uniswap_v3:${intent.sourceChain}:${pool.poolAddress}:${pool.feeTier}`,
        protocolKey: this.protocolKey,
        chainKey: intent.sourceChain,
        estimatedAmountOut,
        estimatedGas: pool.estimatedGas,
        swapFeeBps: feeBps,
        slippageBps: pool.priceImpactBps,
        liquidityScore: pool.liquidityScore,
        confidence: pool.liquidityScore >= 0.94 ? 0.9 : 0.8,
        metadata: {
          poolAddress: pool.poolAddress,
          routerAddress: pool.routerAddress ?? this.routerAddress,
          routeExecutorAddress: this.routeExecutorAddress,
          tokenIn,
          tokenOut,
          feeTier: pool.feeTier,
          direction,
          edgeBps,
          netDeltaBps,
          flashCallbackSupported: pool.flashSupported,
          discoveryMode: 'seeded',
          quoteModel: 'seeded_uniswap_v3_heuristic',
          routeAction: 'exact_input_single',
        },
      }
    })
  }

  async validate(route: PlannedRoute): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = []
    const swapSteps = route.steps.filter((step) => step.protocolKey === this.protocolKey && step.type === 'swap')

    if (swapSteps.length === 0) {
      issues.push({ check: 'uniswap_swap_steps', severity: 'error', message: 'No Uniswap v3 swap steps found on route' })
    }

    for (const step of swapSteps) {
      const feeTier = Number(step.params.feeTier ?? 0)
      if (![100, 500, 3000, 10000].includes(feeTier)) {
        issues.push({
          check: 'uniswap_fee_tier',
          severity: 'error',
          message: `Unsupported Uniswap v3 fee tier on ${step.stepId}: ${feeTier}`,
        })
      }

      if (!step.params.poolAddress) {
        issues.push({
          check: 'uniswap_pool',
          severity: 'warning',
          message: `Swap step ${step.stepId} is missing a resolved pool address`,
        })
      }

      if (Number(step.params.slippageBps ?? 0) > 75) {
        issues.push({
          check: 'uniswap_slippage',
          severity: 'warning',
          message: `Swap step ${step.stepId} exceeds the preferred concentrated-liquidity slippage envelope`,
        })
      }
    }

    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
    }
  }

  async buildExecution(route: PlannedRoute): Promise<ExecutionPayload> {
    const swapSteps = route.steps.filter((step) => step.type === 'swap' && step.protocolKey === this.protocolKey)
    const executionDeadlineSec = toExecutionDeadlineSeconds(route.metadata?.deadlineMs as number | string | undefined)

    const swaps: ExecutorStepPlan[] = swapSteps.map((step) => ({
      stepId: step.stepId,
      action: step.action,
      poolAddress: String(step.params.poolAddress ?? ''),
      routerAddress: String(step.params.routerAddress ?? this.routerAddress),
      tokenIn: String(step.params.tokenIn ?? ''),
      tokenOut: String(step.params.tokenOut ?? ''),
      feeTier: Number(step.params.feeTier ?? 3000),
      amountIn: String(step.params.amountIn ?? '0'),
      minAmountOut: String(step.params.minAmountOut ?? step.params.estimatedAmountOut ?? '0'),
      deadlineMs: executionDeadlineSec,
      auxData: this.protocolKey,
    }))

    const data = encodeSwapPlanCall({
      routeId: route.routeId,
      deadline: executionDeadlineSec,
      atomic: route.executionModel === 'same_chain_atomic',
      swapSteps: swaps,
    })

    const envelope = decodeCalldataEnvelope(data)

    return {
      chainKey: route.sourceChain,
      to: this.routeExecutorAddress,
      data,
      value: '0',
      method: 'executeSwapPlan',
      summary: {
        routeId: route.routeId,
        swapCount: swaps.length,
        firstPool: swaps[0]?.poolAddress,
        executionDeadlineSec,
        calldataSelector: envelope?.selector ?? ROUTE_EXECUTOR_SELECTORS.executeSwapPlan,
      },
      notes: [
        'Builds exact EVM calldata for RouteExecutor.executeSwapPlan(bytes)',
        'Each step is packed in an exact-input-single compatible shape for the executor log/decode path',
        'Pool metadata may come from live RPC discovery or the seeded fallback model',
      ],
    }
  }

  private async tryLiveQuotes(routeInput: RouteInput): Promise<RouteQuote[]> {
    try {
      return await quoteUniswapV3Live(routeInput, {
        addressBook: resolveIntentAssetAddressBook(routeInput.intent),
        transport: this.transportFactory?.(routeInput.intent.sourceChain),
      })
    } catch {
      return []
    }
  }
}

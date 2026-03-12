import type { ExecutionPayload, PlannedRoute, RouteInput, RouteQuote, ValidationResult } from '@mde/domain'
import { BaseAdapter } from '../adapter.js'
import {
  encodeAtomicDydxPlanCall,
  ROUTE_EXECUTOR_SELECTORS,
  toExecutionDeadlineSeconds,
  type ExecutorStepPlan,
} from '../executor-encoding.js'
import { resolveAssetReference, resolveIntentAssetAddressBook } from '../discovery/index.js'
import { ProtocolRegistry } from '../registry.js'

type DydxAdapterOptions = {
  registry?: ProtocolRegistry
  soloMarginAddress?: string
  routeExecutorAddress?: string
}

const DEFAULT_ROUTE_EXECUTOR = '{{ROUTE_EXECUTOR}}'
const DEFAULT_SOLO_MARGIN = '0x1E0447b19BB6EcFdae1e4Ae1694b0C3659614e4e'

export class DydxAdapter extends BaseAdapter {
  readonly protocolKey = 'dydx' as const

  private readonly registry: ProtocolRegistry
  private readonly soloMarginAddress: string
  private readonly routeExecutorAddress: string

  constructor(options: DydxAdapterOptions = {}) {
    super()
    this.registry = options.registry ?? new ProtocolRegistry()
    this.soloMarginAddress = options.soloMarginAddress ?? DEFAULT_SOLO_MARGIN
    this.routeExecutorAddress = options.routeExecutorAddress ?? DEFAULT_ROUTE_EXECUTOR
  }

  async quote(routeInput: RouteInput): Promise<RouteQuote[]> {
    const { intent } = routeInput
    if (!intent.requireFlashLiquidity) return []
    if (intent.sourceChain !== 'ethereum') return []

    const deployment = this.resolveDeployment(intent.sourceChain)
    if (!deployment) return []

    const borrowAsset = intent.inputAssets[0] ?? intent.outputAssets[0] ?? 'USDC'
    const amountIn = intent.amountIn ?? '0'
    const marketId = this.resolveMarketId(borrowAsset, intent.metadata?.dydxMarketId)
    if (marketId === undefined) return []

    const addressBook = resolveIntentAssetAddressBook(intent)
    const assetRef = resolveAssetReference(intent.sourceChain, borrowAsset, addressBook)
    const soloMarginAddress = deployment.contracts.soloMargin ?? this.soloMarginAddress

    return [{
      routeId: `${intent.intentId}:dydx:${intent.sourceChain}:${borrowAsset}`,
      protocolKey: this.protocolKey,
      chainKey: intent.sourceChain,
      estimatedAmountOut: amountIn,
      estimatedGas: '430000',
      flashFeeBps: 0,
      liquidityScore: 0.81,
      confidence: 0.76,
      metadata: {
        routeTemplate: 'flash_envelope',
        routeAction: 'operate',
        repayAction: 'repay_flash_loan',
        callbackType: 'callFunction',
        flashProviderAddress: soloMarginAddress,
        soloMarginAddress,
        marketId,
        borrowAsset,
        borrowAssetAddress: assetRef.address,
        borrowAmount: amountIn,
        routeExecutorAddress: this.routeExecutorAddress,
        quoteModel: 'solo_margin_flash_envelope',
        discoveryMode: 'seeded',
        warnings: !String(soloMarginAddress).startsWith('0x')
          ? ['dYdX Solo Margin address still needs deployment hydration']
          : [],
      },
    }]
  }

  async validate(route: PlannedRoute): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = []
    const flashStep = route.steps.find((step) => step.type === 'flash_borrow' && step.protocolKey === this.protocolKey)
    const repayStep = route.steps.find((step) => step.type === 'repay' && step.protocolKey === this.protocolKey)
    const soloMarginAddress = String(route.metadata?.soloMarginAddress ?? route.metadata?.flashProviderAddress ?? '')
    const marketId = route.metadata?.marketId

    if (route.sourceChain !== 'ethereum') {
      issues.push({ check: 'dydx_chain_scope', severity: 'error', message: 'dYdX Solo Margin flash execution is only supported on Ethereum' })
    }

    if (!flashStep) {
      issues.push({ check: 'dydx_flash_step', severity: 'error', message: 'dYdX execution requires a flash borrow step' })
    }

    if (!repayStep) {
      issues.push({ check: 'dydx_repay_step', severity: 'error', message: 'dYdX execution requires an explicit repay step' })
    }

    if (!soloMarginAddress) {
      issues.push({ check: 'dydx_solo_margin', severity: 'error', message: 'Solo Margin address is missing from route metadata' })
    }

    if (typeof marketId !== 'number') {
      issues.push({ check: 'dydx_market_id', severity: 'error', message: 'dYdX marketId is missing from route metadata' })
    }

    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
    }
  }

  async buildExecution(route: PlannedRoute): Promise<ExecutionPayload> {
    const flashStep = route.steps.find((step) => step.type === 'flash_borrow' && step.protocolKey === this.protocolKey)
    const repayStep = route.steps.find((step) => step.type === 'repay' && step.protocolKey === this.protocolKey)
    const swapSteps = route.steps.filter((step) => step.type === 'swap')
    const executionDeadlineSec = toExecutionDeadlineSeconds(route.metadata?.deadlineMs as number | string | undefined)

    const borrowAssetAddress = String(route.metadata?.borrowAssetAddress ?? flashStep?.params.borrowAssetAddress ?? flashStep?.params.borrowAsset ?? '')
    const amountOwed = String(repayStep?.params.amountOwed ?? route.metadata?.amountOwed ?? flashStep?.params.amountIn ?? '0')
    const borrowAmount = String(flashStep?.params.amountIn ?? route.metadata?.borrowAmount ?? '0')

    const encodedSteps: ExecutorStepPlan[] = swapSteps.map((step) => ({
      stepId: step.stepId,
      action: step.action,
      poolAddress: String(step.params.poolAddress ?? ''),
      routerAddress: String(step.params.routerAddress ?? ''),
      tokenIn: String(step.params.tokenIn ?? ''),
      tokenOut: String(step.params.tokenOut ?? ''),
      feeTier: Number(step.params.feeTier ?? 0),
      amountIn: String(step.params.amountIn ?? '0'),
      minAmountOut: String(step.params.minAmountOut ?? step.params.estimatedAmountOut ?? '0'),
      deadlineMs: executionDeadlineSec,
      auxData: step.protocolKey,
    }))

    const data = encodeAtomicDydxPlanCall({
      routeId: route.routeId,
      repaymentAsset: String(repayStep?.params.repayAssetAddress ?? repayStep?.params.repayAsset ?? borrowAssetAddress),
      principal: borrowAmount,
      amountOwed,
      deadline: executionDeadlineSec,
      soloMargin: String(route.metadata?.soloMarginAddress ?? route.metadata?.flashProviderAddress ?? this.soloMarginAddress),
      marketId: Number(route.metadata?.marketId ?? 2),
      borrowAsset: borrowAssetAddress,
      borrowAmount,
      swapSteps: encodedSteps,
    })

    return {
      chainKey: route.sourceChain,
      to: this.routeExecutorAddress,
      data,
      value: '0',
      method: 'executeAtomicDydxPlan',
      summary: {
        routeId: route.routeId,
        soloMargin: String(route.metadata?.soloMarginAddress ?? route.metadata?.flashProviderAddress ?? this.soloMarginAddress),
        marketId: Number(route.metadata?.marketId ?? 2),
        borrowAmount,
        amountOwed,
        swapCount: swapSteps.length,
        executionDeadlineSec,
        calldataSelector: ROUTE_EXECUTOR_SELECTORS.executeAtomicDydxPlan,
      },
      notes: [
        'Builds exact EVM calldata for RouteExecutor.executeAtomicDydxPlan(bytes)',
        'dYdX support is intentionally scoped to Ethereum Solo Margin flash envelopes',
        'USDC marketId 2 is seeded by default unless intent metadata overrides it',
      ],
    }
  }

  private resolveDeployment(chainKey: string) {
    return this.registry.getByProtocolAndChain(this.protocolKey, chainKey)[0]
  }

  private resolveMarketId(asset: unknown, explicit: unknown): number | undefined {
    if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit >= 0) {
      return Math.trunc(explicit)
    }
    if (typeof explicit === 'string' && /^\d+$/.test(explicit)) {
      return Number(explicit)
    }

    const normalized = String(asset ?? '').toUpperCase()
    if (normalized === 'USDC') return 2
    return undefined
  }
}

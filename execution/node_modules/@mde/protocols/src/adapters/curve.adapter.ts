import type { ExecutionPayload, PlannedRoute, RouteInput, RouteQuote, ValidationResult } from '@mde/domain'
import { BaseAdapter } from '../adapter.js'
import { encodeSwapPlanCall, ROUTE_EXECUTOR_SELECTORS, toExecutionDeadlineSeconds, type ExecutorStepPlan } from '../executor-encoding.js'
import { ProtocolRegistry } from '../registry.js'
import { applyBpsDelta } from '../utils.js'

type CurveAdapterOptions = {
  registry?: ProtocolRegistry
  routeExecutorAddress?: string
}

const DEFAULT_ROUTE_EXECUTOR = '{{ROUTE_EXECUTOR}}'
const STABLES = new Set(['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'USDE', 'CRVUSD'])

export class CurveAdapter extends BaseAdapter {
  readonly protocolKey = 'curve' as const

  private readonly registry: ProtocolRegistry
  private readonly routeExecutorAddress: string

  constructor(options: CurveAdapterOptions = {}) {
    super()
    this.registry = options.registry ?? new ProtocolRegistry()
    this.routeExecutorAddress = options.routeExecutorAddress ?? DEFAULT_ROUTE_EXECUTOR
  }

  async quote(routeInput: RouteInput): Promise<RouteQuote[]> {
    const { intent } = routeInput
    const deployment = this.resolveDeployment(intent.sourceChain)
    const tokenIn = intent.inputAssets[0]
    const tokenOut = intent.outputAssets[0]
    const amountIn = intent.amountIn ?? '0'

    if (!deployment || !tokenIn || !tokenOut || tokenIn === tokenOut) return []

    const stablePair = STABLES.has(tokenIn.toUpperCase()) && STABLES.has(tokenOut.toUpperCase())
    const baseFeeBps = stablePair ? 4 : 10
    const priceImpactBps = stablePair ? 3 : 12
    const edgeBps = stablePair ? 18 : 26
    const estimatedAmountOut = applyBpsDelta(amountIn, edgeBps - baseFeeBps - priceImpactBps)
    const target = deployment.contracts.registry ?? deployment.contracts.crvUsdFlashLender ?? ''

    return [{
      routeId: `${intent.intentId}:curve:${intent.sourceChain}:${tokenIn}:${tokenOut}`,
      protocolKey: this.protocolKey,
      chainKey: intent.sourceChain,
      estimatedAmountOut,
      estimatedGas: stablePair ? '225000' : '290000',
      swapFeeBps: baseFeeBps,
      slippageBps: priceImpactBps,
      liquidityScore: stablePair ? 0.88 : 0.74,
      confidence: stablePair ? 0.83 : 0.7,
      metadata: {
        routerAddress: target,
        poolAddress: '',
        routeExecutorAddress: this.routeExecutorAddress,
        tokenIn,
        tokenOut,
        feeTier: 0,
        routeAction: 'stable_swap',
        quoteModel: stablePair ? 'seeded_curve_stableswap_heuristic' : 'seeded_curve_cryptoswap_heuristic',
        discoveryMode: 'seeded',
        warnings: !String(target).startsWith('0x')
          ? ['Curve registry/pool target still needs concrete per-chain pool resolution']
          : [],
      },
    }]
  }

  async validate(route: PlannedRoute): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = []
    const swapSteps = route.steps.filter((step) => step.protocolKey === this.protocolKey && step.type === 'swap')

    if (swapSteps.length === 0) {
      issues.push({ check: 'curve_swap_steps', severity: 'error', message: 'No Curve swap steps found on route' })
    }

    for (const step of swapSteps) {
      if (!step.params.routerAddress && !step.params.poolAddress) {
        issues.push({ check: 'curve_target', severity: 'warning', message: `Curve step ${step.stepId} still needs a concrete pool or exchange target` })
      }
    }

    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
    }
  }

  async buildExecution(route: PlannedRoute): Promise<ExecutionPayload> {
    const executionDeadlineSec = toExecutionDeadlineSeconds(route.metadata?.deadlineMs as number | string | undefined)
    const swaps: ExecutorStepPlan[] = route.steps
      .filter((step) => step.protocolKey === this.protocolKey && step.type === 'swap')
      .map((step) => ({
        stepId: step.stepId,
        action: 'stable_swap',
        poolAddress: String(step.params.poolAddress ?? ''),
        routerAddress: String(step.params.routerAddress ?? ''),
        tokenIn: String(step.params.tokenIn ?? ''),
        tokenOut: String(step.params.tokenOut ?? ''),
        feeTier: 0,
        amountIn: String(step.params.amountIn ?? '0'),
        minAmountOut: String(step.params.minAmountOut ?? step.params.estimatedAmountOut ?? '0'),
        deadlineMs: executionDeadlineSec,
        auxData: this.protocolKey,
      }))

    return {
      chainKey: route.sourceChain,
      to: this.routeExecutorAddress,
      data: encodeSwapPlanCall({
        routeId: route.routeId,
        deadline: executionDeadlineSec,
        atomic: route.executionModel === 'same_chain_atomic',
        swapSteps: swaps,
      }),
      value: '0',
      method: 'executeSwapPlan',
      summary: {
        routeId: route.routeId,
        swapCount: swaps.length,
        protocol: this.protocolKey,
        executionDeadlineSec,
        calldataSelector: ROUTE_EXECUTOR_SELECTORS.executeSwapPlan,
      },
      notes: [
        'Builds exact EVM calldata for RouteExecutor.executeSwapPlan(bytes)',
        'Curve steps are packed as stable-swap style actions with zero fee-tier semantics',
        'Pool resolution remains heuristic unless a concrete Curve pool target is supplied in route metadata',
      ],
    }
  }

  private resolveDeployment(chainKey: string) {
    return this.registry.getByProtocolAndChain(this.protocolKey, chainKey)[0]
  }
}

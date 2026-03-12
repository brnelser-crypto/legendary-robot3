import type { ExecutionPayload, PlannedRoute, RouteInput, RouteQuote, ValidationResult } from '@mde/domain'
import { BaseAdapter } from '../adapter.js'
import { encodeSwapPlanCall, ROUTE_EXECUTOR_SELECTORS, toExecutionDeadlineSeconds, type ExecutorStepPlan } from '../executor-encoding.js'
import { ProtocolRegistry } from '../registry.js'
import { applyBpsDelta } from '../utils.js'

type SushiSwapAdapterOptions = {
  registry?: ProtocolRegistry
  routeProcessorAddress?: string
  routeExecutorAddress?: string
}

const DEFAULT_ROUTE_EXECUTOR = '{{ROUTE_EXECUTOR}}'
const DEFAULT_ROUTE_PROCESSOR = '{{SUSHI_ROUTE_PROCESSOR}}'
const STABLES = new Set(['USDC', 'USDT', 'DAI', 'FRAX'])

export class SushiSwapAdapter extends BaseAdapter {
  readonly protocolKey = 'sushiswap' as const

  private readonly registry: ProtocolRegistry
  private readonly routeProcessorAddress: string
  private readonly routeExecutorAddress: string

  constructor(options: SushiSwapAdapterOptions = {}) {
    super()
    this.registry = options.registry ?? new ProtocolRegistry()
    this.routeProcessorAddress = options.routeProcessorAddress ?? DEFAULT_ROUTE_PROCESSOR
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
    const baseFeeBps = deployment.feeModel.value ?? (stablePair ? 18 : 24)
    const priceImpactBps = stablePair ? 8 : 22
    const routingEdgeBps = stablePair ? 34 : 47
    const estimatedAmountOut = applyBpsDelta(amountIn, routingEdgeBps - baseFeeBps - priceImpactBps)
    const routeProcessorAddress = this.routeProcessorAddress

    return [{
      routeId: `${intent.intentId}:sushiswap:${intent.sourceChain}:${tokenIn}:${tokenOut}`,
      protocolKey: this.protocolKey,
      chainKey: intent.sourceChain,
      estimatedAmountOut,
      estimatedGas: stablePair ? '260000' : '320000',
      swapFeeBps: baseFeeBps,
      slippageBps: priceImpactBps,
      liquidityScore: stablePair ? 0.79 : 0.72,
      confidence: stablePair ? 0.75 : 0.69,
      metadata: {
        routeProcessorAddress,
        routerAddress: routeProcessorAddress,
        routeExecutorAddress: this.routeExecutorAddress,
        tokenIn,
        tokenOut,
        feeTier: 0,
        routeAction: 'route_processor',
        quoteModel: stablePair ? 'seeded_sushi_route_processor_stable_heuristic' : 'seeded_sushi_route_processor_volatile_heuristic',
        discoveryMode: 'seeded',
        warnings: !String(routeProcessorAddress).startsWith('0x')
          ? ['Sushi route processor address still needs deployment hydration']
          : [],
      },
    }]
  }

  async validate(route: PlannedRoute): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = []
    const swapSteps = route.steps.filter((step) => step.protocolKey === this.protocolKey && step.type === 'swap')

    if (swapSteps.length === 0) {
      issues.push({ check: 'sushi_swap_steps', severity: 'error', message: 'No Sushi swap steps found on route' })
    }

    for (const step of swapSteps) {
      if (!step.params.routerAddress) {
        issues.push({ check: 'sushi_router', severity: 'warning', message: `Swap step ${step.stepId} is missing a Sushi route processor binding` })
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
        action: 'route_processor',
        poolAddress: String(step.params.poolAddress ?? ''),
        routerAddress: String(step.params.routerAddress ?? this.routeProcessorAddress),
        tokenIn: String(step.params.tokenIn ?? ''),
        tokenOut: String(step.params.tokenOut ?? ''),
        feeTier: Number(step.params.feeTier ?? 0),
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
        'Sushi routes are modeled as Route Processor style steps so the executor can carry token pair and min-out metadata together',
        'If Sushi deployment metadata is unresolved the encoded target will remain zero-addressed until hydrated',
      ],
    }
  }

  private resolveDeployment(chainKey: string) {
    return this.registry.getByProtocolAndChain(this.protocolKey, chainKey)[0]
  }
}

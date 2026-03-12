import type { ExecutionPayload, PlannedRoute, RouteInput, RouteQuote, ValidationResult } from '@mde/domain'
import { BaseAdapter } from '../adapter.js'
import { encodeSwapPlanCall, ROUTE_EXECUTOR_SELECTORS, toExecutionDeadlineSeconds, type ExecutorStepPlan } from '../executor-encoding.js'
import { ProtocolRegistry } from '../registry.js'
import { applyBpsDelta } from '../utils.js'

type PancakeSwapAdapterOptions = {
  registry?: ProtocolRegistry
  routerAddress?: string
  routeExecutorAddress?: string
}

const DEFAULT_ROUTE_EXECUTOR = '{{ROUTE_EXECUTOR}}'
const DEFAULT_ROUTER = '{{PANCAKESWAP_ROUTER}}'
const FEE_TIERS = [100, 500, 2500, 10000]
const STABLES = new Set(['USDC', 'USDT', 'DAI', 'FDUSD', 'USDE', 'FRAX'])

export class PancakeSwapAdapter extends BaseAdapter {
  readonly protocolKey = 'pancakeswap' as const

  private readonly registry: ProtocolRegistry
  private readonly routerAddress: string
  private readonly routeExecutorAddress: string

  constructor(options: PancakeSwapAdapterOptions = {}) {
    super()
    this.registry = options.registry ?? new ProtocolRegistry()
    this.routerAddress = options.routerAddress ?? DEFAULT_ROUTER
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
    const preferredTiers = stablePair ? [100, 500, 2500] : [500, 2500, 10000]
    const resolvedRouter = deployment.contracts.router ?? this.routerAddress

    return preferredTiers.slice(0, 3).map((feeTier, index) => {
      const feeBps = feeTier / 100
      const edgeBps = stablePair ? 46 - index * 6 : 58 - index * 7
      const priceImpactBps = stablePair ? 6 + index * 2 : 16 + index * 5
      const estimatedAmountOut = applyBpsDelta(amountIn, edgeBps - feeBps - priceImpactBps)

      return {
        routeId: `${intent.intentId}:pancakeswap:${intent.sourceChain}:${tokenIn}:${tokenOut}:${feeTier}`,
        protocolKey: this.protocolKey,
        chainKey: intent.sourceChain,
        estimatedAmountOut,
        estimatedGas: stablePair ? '235000' : '285000',
        swapFeeBps: feeBps,
        slippageBps: priceImpactBps,
        liquidityScore: stablePair ? 0.84 - index * 0.03 : 0.78 - index * 0.04,
        confidence: stablePair ? 0.8 - index * 0.03 : 0.74 - index * 0.04,
        metadata: {
          routerAddress: resolvedRouter,
          routeExecutorAddress: this.routeExecutorAddress,
          tokenIn,
          tokenOut,
          feeTier,
          routeAction: 'exact_input_single',
          quoteModel: stablePair ? 'seeded_pancakeswap_v3_stable_heuristic' : 'seeded_pancakeswap_v3_volatile_heuristic',
          discoveryMode: 'seeded',
          warnings: !String(resolvedRouter).startsWith('0x')
            ? ['PancakeSwap router still needs chain-specific deployment resolution']
            : [],
        },
      }
    })
  }

  async validate(route: PlannedRoute): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = []
    const swapSteps = route.steps.filter((step) => step.protocolKey === this.protocolKey && step.type === 'swap')

    if (swapSteps.length === 0) {
      issues.push({ check: 'pancake_swap_steps', severity: 'error', message: 'No PancakeSwap swap steps found on route' })
    }

    for (const step of swapSteps) {
      const feeTier = Number(step.params.feeTier ?? 0)
      if (!FEE_TIERS.includes(feeTier)) {
        issues.push({ check: 'pancake_fee_tier', severity: 'error', message: `Unsupported PancakeSwap v3 fee tier on ${step.stepId}: ${feeTier}` })
      }

      if (!step.params.routerAddress) {
        issues.push({ check: 'pancake_router', severity: 'warning', message: `Swap step ${step.stepId} is missing a resolved PancakeSwap router address` })
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
        action: 'exact_input_single',
        poolAddress: String(step.params.poolAddress ?? ''),
        routerAddress: String(step.params.routerAddress ?? this.routerAddress),
        tokenIn: String(step.params.tokenIn ?? ''),
        tokenOut: String(step.params.tokenOut ?? ''),
        feeTier: Number(step.params.feeTier ?? 2500),
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
        'Quote model assumes PancakeSwap v3 exactInputSingle-style execution with 0.01%, 0.05%, 0.25%, or 1% fee tiers',
        'If the chain-specific router is unresolved the encoded target will be zero-addressed until deployment metadata is supplied',
      ],
    }
  }

  private resolveDeployment(chainKey: string) {
    return this.registry.getByProtocolAndChain(this.protocolKey, chainKey)[0]
  }
}

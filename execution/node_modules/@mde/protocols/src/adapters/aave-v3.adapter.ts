import type {
  AaveReserveState,
  ExecutionPayload,
  PlannedRoute,
  RouteInput,
  RouteQuote,
  ValidationResult,
} from '@mde/domain'
import { BaseAdapter } from '../adapter.js'
import {
  encodeAtomicAavePlanCall,
  ROUTE_EXECUTOR_SELECTORS,
  toExecutionDeadlineSeconds,
  type ExecutorStepPlan,
} from '../executor-encoding.js'
import { ProtocolRegistry } from '../registry.js'
import { addBps } from '../utils.js'
import {
  discoverAaveV3Reserve,
  isAaveReserveFlashEligible,
  resolveAssetReference,
  resolveIntentAssetAddressBook,
  type JsonRpcTransport,
} from '../discovery/index.js'

type AaveV3AdapterOptions = {
  registry?: ProtocolRegistry
  receiverAddress?: string
  routeExecutorAddress?: string
  transportFactory?: (chainKey: string) => JsonRpcTransport | undefined
}

const DEFAULT_AAVE_RECEIVER = '{{AAVE_RECEIVER}}'
const DEFAULT_ROUTE_EXECUTOR = '{{ROUTE_EXECUTOR}}'

export class AaveV3Adapter extends BaseAdapter {
  readonly protocolKey = 'aave_v3' as const

  private readonly registry: ProtocolRegistry
  private readonly receiverAddress: string
  private readonly routeExecutorAddress: string
  private readonly transportFactory?: (chainKey: string) => JsonRpcTransport | undefined

  constructor(options: AaveV3AdapterOptions = {}) {
    super()
    this.registry = options.registry ?? new ProtocolRegistry()
    this.receiverAddress = options.receiverAddress ?? DEFAULT_AAVE_RECEIVER
    this.routeExecutorAddress = options.routeExecutorAddress ?? DEFAULT_ROUTE_EXECUTOR
    this.transportFactory = options.transportFactory
  }

  async quote(routeInput: RouteInput): Promise<RouteQuote[]> {
    const { intent } = routeInput
    if (!intent.requireFlashLiquidity) return []

    const deployment = this.resolveDeployment(intent.sourceChain)
    if (!deployment) return []

    const amountIn = intent.amountIn ?? '0'
    const borrowAsset = intent.inputAssets[0] ?? intent.outputAssets[0] ?? 'UNKNOWN'
    const flashMethod = intent.inputAssets.length > 1 ? 'flashLoan' : 'flashLoanSimple'
    const flashFeeBps = deployment.feeModel.value ?? 5
    const addressBook = resolveIntentAssetAddressBook(intent)
    const assetRef = resolveAssetReference(intent.sourceChain, borrowAsset, addressBook)
    const reserveState = await this.tryDiscoverReserve(intent.sourceChain, borrowAsset, addressBook)

    if (reserveState && !isAaveReserveFlashEligible(reserveState)) {
      return []
    }

    const poolAddress = reserveState?.poolAddress ?? deployment.contracts.pool ?? 'DISCOVER_FROM_AAVE_ADDRESSES_PROVIDER'
    const deploymentResolved = !poolAddress.includes('DISCOVER')
    const warnings = reserveState?.warnings ?? []

    return [
      {
        routeId: `${intent.intentId}:aave_v3:${intent.sourceChain}:${borrowAsset}`,
        protocolKey: this.protocolKey,
        chainKey: intent.sourceChain,
        estimatedAmountOut: amountIn,
        estimatedGas: flashMethod === 'flashLoanSimple' ? '350000' : '500000',
        flashFeeBps,
        liquidityScore: reserveState ? 0.98 : 0.95,
        confidence: reserveState ? 0.96 : deploymentResolved ? 0.84 : 0.72,
        metadata: {
          aavePool: poolAddress,
          flashProviderAddress: poolAddress,
          borrowAsset,
          borrowAssetAddress: assetRef.address,
          borrowAmount: amountIn,
          flashMethod,
          callbackType: deployment.callbackType ?? 'executeOperation',
          receiverAddress: this.receiverAddress,
          routeExecutorAddress: this.routeExecutorAddress,
          deploymentResolved,
          discoveryMode: reserveState ? reserveState.discoveryMode : 'seeded',
          stateTimestampMs: reserveState?.discoveredAtMs,
          reserveState,
          quoteModel: reserveState ? 'live_aave_v3_reserve_state' : 'deployment_seed_aave_v3',
          routeTemplate: 'flash_envelope',
          routeAction: 'flash_borrow',
          repayAction: 'repay_flash_loan',
          warnings,
        },
      },
    ]
  }

  async validate(route: PlannedRoute): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = []
    const deployment = this.resolveDeployment(route.sourceChain)
    const flashStep = route.steps.find((step) => step.type === 'flash_borrow' && step.protocolKey === this.protocolKey)
    const repayStep = route.steps.find((step) => step.type === 'repay')
    const reserveState = route.metadata?.reserveState as AaveReserveState | undefined

    if (!deployment) {
      issues.push({ check: 'aave_deployment', severity: 'error', message: `No Aave V3 deployment configured for ${route.sourceChain}` })
    }

    if (!flashStep) {
      issues.push({ check: 'aave_flash_step', severity: 'error', message: 'Atomic Aave execution requires a flash borrow step' })
    }

    if (!repayStep) {
      issues.push({ check: 'aave_repayment', severity: 'error', message: 'Atomic Aave execution requires an explicit repayment step' })
    }

    const poolAddress = String(route.metadata?.aavePool ?? deployment?.contracts.pool ?? '')
    if (!poolAddress || poolAddress.includes('DISCOVER')) {
      issues.push({
        check: 'aave_pool_resolution',
        severity: 'warning',
        message: `Aave pool for ${route.sourceChain} still needs final address resolution from deployment metadata`,
      })
    }

    if (!route.metadata?.callbackType) {
      issues.push({
        check: 'aave_callback',
        severity: 'error',
        message: 'Route metadata is missing the Aave executeOperation callback binding',
      })
    }

    if (reserveState) {
      if (!reserveState.isActive) issues.push({ check: 'aave_reserve_active', severity: 'error', message: 'Aave reserve is not active' })
      if (reserveState.isFrozen) issues.push({ check: 'aave_reserve_frozen', severity: 'error', message: 'Aave reserve is frozen' })
      if (!reserveState.borrowingEnabled) issues.push({ check: 'aave_reserve_borrowing', severity: 'error', message: 'Aave reserve borrowing is disabled' })
      if (reserveState.paused) issues.push({ check: 'aave_reserve_paused', severity: 'error', message: 'Aave reserve is paused' })
      if (!reserveState.flashLoanEnabled) issues.push({ check: 'aave_reserve_flash', severity: 'error', message: 'Aave reserve flash loans are disabled' })
    }

    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
    }
  }

  async buildExecution(route: PlannedRoute): Promise<ExecutionPayload> {
    const deployment = this.resolveDeployment(route.sourceChain)
    const flashStep = route.steps.find((step) => step.type === 'flash_borrow')
    const repayStep = route.steps.find((step) => step.type === 'repay')
    const swapSteps = route.steps.filter((step) => step.type === 'swap')

    const borrowAssetAddress = String(
      route.metadata?.borrowAssetAddress ?? flashStep?.params.borrowAssetAddress ?? flashStep?.params.borrowAsset ?? ''
    )
    const borrowAsset = String(route.metadata?.borrowAsset ?? flashStep?.params.borrowAsset ?? 'UNKNOWN')
    const borrowAmount = String(flashStep?.params.amountIn ?? route.metadata?.borrowAmount ?? '0')
    const amountOwed = String(repayStep?.params.amountOwed ?? route.metadata?.amountOwed ?? addBps(borrowAmount, deployment?.feeModel.value ?? 5))
    const executionDeadlineSec = toExecutionDeadlineSeconds(route.metadata?.deadlineMs as number | string | undefined)

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

    const data = encodeAtomicAavePlanCall({
      routeId: route.routeId,
      repaymentAsset: String(repayStep?.params.repayAssetAddress ?? repayStep?.params.repayAsset ?? borrowAssetAddress),
      principal: borrowAmount,
      amountOwed,
      deadline: executionDeadlineSec,
      aavePool: String(route.metadata?.aavePool ?? deployment?.contracts.pool ?? ''),
      receiver: String(route.metadata?.receiverAddress ?? this.receiverAddress),
      borrowAsset: borrowAssetAddress,
      borrowAmount,
      swapSteps: encodedSteps,
    })

    return {
      chainKey: route.sourceChain,
      to: this.routeExecutorAddress,
      data,
      value: '0',
      method: 'executeAtomicAavePlan',
      summary: {
        routeId: route.routeId,
        aavePool: String(route.metadata?.aavePool ?? deployment?.contracts.pool ?? ''),
        borrowAsset,
        borrowAmount,
        amountOwed,
        swapCount: swapSteps.length,
        executionDeadlineSec,
        calldataSelector: ROUTE_EXECUTOR_SELECTORS.executeAtomicAavePlan,
      },
      notes: [
        'Builds exact EVM calldata for RouteExecutor.executeAtomicAavePlan(bytes)',
        'Swap legs are packed as static step tuples so mixed Uniswap/Pancake/Sushi/Curve cycles can share one executor envelope',
        'Intent deadline milliseconds are normalized to onchain seconds before packing',
      ],
    }
  }

  private resolveDeployment(chainKey: string) {
    return this.registry.getByProtocolAndChain(this.protocolKey, chainKey)[0]
  }

  private async tryDiscoverReserve(
    chainKey: string,
    borrowAsset: string,
    addressBook: Record<string, string>
  ): Promise<AaveReserveState | undefined> {
    try {
      return await discoverAaveV3Reserve({
        chainKey,
        asset: borrowAsset,
        addressBook,
        registry: this.registry,
        transport: this.transportFactory?.(chainKey),
      })
    } catch {
      return undefined
    }
  }
}

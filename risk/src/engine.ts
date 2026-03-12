import type { AaveReserveState, PlannedRoute, RiskCheckResult, RiskEvaluation } from '@mde/domain'
import { createLogger } from '@mde/monitoring'
import { PRE_TRADE_CHECKS } from './checks.js'

export class RiskEngine {
  private readonly logger = createLogger('risk-engine')

  async evaluate(route: PlannedRoute): Promise<RiskEvaluation> {
    const checks: RiskCheckResult[] = PRE_TRADE_CHECKS.map((name) => this.runCheck(name, route))

    const errors = checks.filter((item) => item.severity === 'error' && !item.passed)
    const evaluation: RiskEvaluation = {
      approved: errors.length === 0,
      checks,
      warnings: route.warnings,
    }

    this.logger.info('risk_evaluated', {
      routeId: route.routeId,
      approved: evaluation.approved,
      warnings: evaluation.warnings.length,
    })

    return evaluation
  }

  private runCheck(name: string, route: PlannedRoute): RiskCheckResult {
    const metadata = route.metadata ?? {}
    const flashStep = route.steps.find((step) => step.type === 'flash_borrow')
    const swapSteps = route.steps.filter((step) => step.type === 'swap')
    const repayStep = route.steps.find((step) => step.type === 'repay')
    const reserveState = metadata.reserveState as AaveReserveState | undefined

    switch (name) {
      case 'reserve_eligibility': {
        if (!flashStep) return this.pass(name, 'warning', 'No flash reserve involved on this route')

        if (flashStep.protocolKey === 'aave_v3' && reserveState) {
          if (!reserveState.isActive) return this.fail(name, 'error', 'Aave reserve is not active')
          if (reserveState.isFrozen) return this.fail(name, 'error', 'Aave reserve is frozen')
          if (!reserveState.borrowingEnabled) return this.fail(name, 'error', 'Aave reserve borrowing is disabled')
          if (reserveState.paused) return this.fail(name, 'error', 'Aave reserve is paused')
          if (!reserveState.flashLoanEnabled) return this.fail(name, 'error', 'Aave reserve flash loans are disabled')
          return this.pass(name, 'error', `Live reserve state confirms flash eligibility on ${reserveState.poolAddress}`)
        }

        const flashProviderAddress = String(
          metadata.flashProviderAddress ??
            metadata.aavePool ??
            metadata.soloMarginAddress ??
            flashStep.params.flashProviderAddress ??
            flashStep.params.aavePool ??
            flashStep.params.soloMarginAddress ??
            ''
        )

        return flashProviderAddress
          ? this.pass(name, 'warning', `${flashStep.protocolKey} flash route is bound to ${flashProviderAddress}`)
          : this.fail(name, 'error', `Flash route is missing a concrete provider binding for ${flashStep.protocolKey}`)
      }

      case 'pool_liquidity': {
        const liquidity = Number(metadata.swapLiquidityScore ?? metadata.liquidityScore ?? 0.5)
        const suffix = metadata.discoveryModes ? ` (modes: ${String(metadata.discoveryModes)})` : ''
        return liquidity >= 0.55
          ? this.pass(name, 'error', `Liquidity score ${liquidity.toFixed(2)} is above the execution threshold${suffix}`)
          : this.fail(name, 'error', `Liquidity score ${liquidity.toFixed(2)} is too low for safe execution${suffix}`)
      }

      case 'fee_tier': {
        if (swapSteps.length === 0) {
          return this.pass(name, 'warning', 'No fee-tiered swap legs are present on this route')
        }

        const invalidStep = swapSteps.find((step) => {
          const feeTier = Number(step.params.feeTier ?? 0)
          if (step.protocolKey === 'uniswap_v3') return ![100, 500, 3000, 10000].includes(feeTier)
          if (step.protocolKey === 'pancakeswap') return ![100, 500, 2500, 10000].includes(feeTier)
          return false
        })

        return invalidStep
          ? this.fail(name, 'error', `Unsupported fee tier on ${invalidStep.stepId}`)
          : this.pass(name, 'error', 'All fee-tiered swap legs are valid for their protocol')
      }

      case 'callback_support': {
        if (!flashStep) return this.pass(name, 'warning', 'Callback validation is not required for non-flash routes')
        const callbackType = String(metadata.callbackType ?? flashStep.params.callbackType ?? '')
        return callbackType
          ? this.pass(name, 'error', `Flash callback ${callbackType} is wired for execution`)
          : this.fail(name, 'error', 'Flash route is missing callback wiring')
      }

      case 'gas_sufficiency': {
        const gasUsd = route.estimatedGasUsd ?? 0
        return gasUsd <= 250
          ? this.pass(name, 'warning', `Estimated gas envelope ${gasUsd.toFixed(4)} USD is acceptable`)
          : this.fail(name, 'warning', `Estimated gas envelope ${gasUsd.toFixed(4)} USD exceeds the preferred threshold`)
      }

      case 'token_approval': {
        if (!flashStep) return this.pass(name, 'warning', 'Token approvals are adapter-specific for non-flash routes')
        if (flashStep.protocolKey === 'aave_v3') {
          return this.pass(name, 'warning', 'Atomic executor must approve the repayment asset back to the Aave Pool before transaction end')
        }
        if (flashStep.protocolKey === 'dydx') {
          return this.pass(name, 'warning', 'dYdX Solo Margin route must finish with a Deposit action that restores borrowed balance before operate() ends')
        }
        return this.pass(name, 'warning', `Flash route ${flashStep.protocolKey} requires protocol-specific repayment approval semantics`)
      }

      case 'repayment_simulation': {
        if (!flashStep && !repayStep) {
          return this.pass(name, 'warning', 'Repayment simulation is only required for flash-backed routes')
        }

        if (!flashStep || !repayStep) {
          return this.fail(name, 'error', 'Flash execution requires an explicit repayment step')
        }

        const expectedFinalAmount = String(metadata.expectedFinalAmount ?? repayStep.params.expectedFinalAmount ?? '0')
        const amountOwed = String(metadata.amountOwed ?? repayStep.params.amountOwed ?? '0')
        return this.compareAmounts(expectedFinalAmount, amountOwed) >= 0
          ? this.pass(name, 'error', `Simulated final amount ${expectedFinalAmount} covers amount owed ${amountOwed}`)
          : this.fail(name, 'error', `Repayment deficit detected: expected ${expectedFinalAmount}, owed ${amountOwed}`)
      }

      case 'slippage_simulation': {
        const maxStrategySlippage = Number(metadata.maxSlippageBps ?? 50)
        const routeSlippage = swapSteps.reduce((total, step) => total + Number(step.params.slippageBps ?? 0), 0)
        return routeSlippage <= maxStrategySlippage
          ? this.pass(name, 'error', `Simulated slippage ${routeSlippage} bps is within strategy tolerance`)
          : this.fail(name, 'error', `Simulated slippage ${routeSlippage} bps exceeds strategy tolerance ${maxStrategySlippage} bps`)
      }

      case 'bridge_compatibility': {
        if (route.executionModel === 'cross_chain_staged' || Boolean(metadata.plannerOnly)) {
          return this.fail(name, 'error', 'Cross-chain staged routes remain planner-only and are not executable yet')
        }

        const bridgeWarnings = route.warnings.filter((warning) => warning.toLowerCase().includes('manual redeem'))
        return bridgeWarnings.length === 0
          ? this.pass(name, 'warning', 'No bridge-specific settlement blockers detected')
          : this.fail(name, 'warning', bridgeWarnings.join('; '))
      }

      case 'deadline_viability': {
        const deadlineMs = Number(metadata.deadlineMs ?? 0)
        if (!deadlineMs) return this.pass(name, 'warning', 'No route deadline metadata attached')
        const timeRemainingMs = deadlineMs - Date.now()
        return timeRemainingMs > 15_000
          ? this.pass(name, 'error', `Deadline remains viable with ${timeRemainingMs}ms remaining`)
          : this.fail(name, 'error', `Route deadline is too close: ${timeRemainingMs}ms remaining`)
      }

      case 'concentrated_liquidity_range': {
        if (swapSteps.length === 0) {
          return this.pass(name, 'warning', 'No concentrated-liquidity swap legs are present')
        }
        const maxPerSwapSlippage = Math.max(...swapSteps.map((step) => Number(step.params.slippageBps ?? 0)), 0)
        return maxPerSwapSlippage <= 60
          ? this.pass(name, 'warning', 'Observed concentrated-liquidity range risk is acceptable')
          : this.fail(name, 'warning', 'Concentrated-liquidity range risk is elevated')
      }

      case 'jit_liquidity_anomaly': {
        const flagged = route.warnings.some((warning) => warning.toLowerCase().includes('jit'))
        return flagged
          ? this.fail(name, 'warning', 'Potential just-in-time liquidity anomaly flagged on route')
          : this.pass(name, 'warning', 'No JIT-liquidity anomaly warnings detected')
      }

      case 'manual_redeem_policy': {
        const manualRedeemWarnings = route.warnings.filter((warning) => warning.toLowerCase().includes('manual redeem'))
        return manualRedeemWarnings.length === 0
          ? this.pass(name, 'warning', 'Manual redeem is not required on this route')
          : this.fail(name, 'warning', manualRedeemWarnings.join('; '))
      }

      case 'stale_state_detection': {
        const stateTimestampMs = Number(metadata.stateTimestampMs ?? 0)
        if (!stateTimestampMs) {
          return this.pass(name, 'warning', 'Route does not carry live state timestamp metadata')
        }
        const stateAgeMs = Date.now() - stateTimestampMs
        return stateAgeMs <= 60_000
          ? this.pass(name, 'warning', `Route state age ${stateAgeMs}ms is within freshness threshold`)
          : this.fail(name, 'warning', `Route state age ${stateAgeMs}ms exceeds freshness threshold`)
      }

      default:
        return this.pass(name, 'warning', 'No protocol-specific rule matched; defaulting to advisory pass')
    }
  }

  private pass(name: string, severity: 'warning' | 'error', message: string): RiskCheckResult {
    return { name, passed: true, severity, message }
  }

  private fail(name: string, severity: 'warning' | 'error', message: string): RiskCheckResult {
    return { name, passed: false, severity, message }
  }

  private compareAmounts(left: string, right: string): number {
    const a = this.safeBigInt(left)
    const b = this.safeBigInt(right)
    if (a === b) return 0
    return a > b ? 1 : -1
  }

  private safeBigInt(value: string): bigint {
    try {
      return BigInt(value)
    } catch {
      return 0n
    }
  }
}

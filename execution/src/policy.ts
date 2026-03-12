import type { ExecutionPayload, ExecutionPreflightDecision, ExecutionSimulation } from '@mde/domain'
import { isHexAddress, safeBigInt } from '@mde/protocols'

export type ExecutionPreflightPolicy = {
  requirePreflight: boolean
  requireFromAddress: boolean
  blockTag: string
  maxEstimatedGas?: string
}

export function loadExecutionPreflightPolicy(env: NodeJS.ProcessEnv = process.env): ExecutionPreflightPolicy {
  const requirePreflight = parseBoolean(env.EXECUTION_REQUIRE_PREFLIGHT)
  const requireFromAddress = parseBoolean(env.EXECUTION_REQUIRE_FROM) || requirePreflight
  const blockTag = env.EXECUTION_PREFLIGHT_BLOCK_TAG?.trim() || 'latest'
  const maxEstimatedGas = env.EXECUTION_MAX_ESTIMATE_GAS?.trim() || undefined

  return {
    requirePreflight,
    requireFromAddress,
    blockTag,
    maxEstimatedGas,
  }
}

export function decideExecutionPreflight(
  payload: ExecutionPayload,
  simulation: ExecutionSimulation | undefined,
  policy: ExecutionPreflightPolicy
): ExecutionPreflightDecision {
  const reasons: string[] = []
  const warnings: string[] = []

  if (!isHexAddress(payload.to)) {
    reasons.push('execution target address is not a valid EVM address')
  }

  if (!payload.data?.startsWith('0x')) {
    reasons.push('execution payload data is not hex encoded')
  }

  if (!simulation) {
    if (policy.requirePreflight) {
      reasons.push('preflight simulation was not produced')
    } else {
      warnings.push('preflight simulation was skipped')
    }
  } else {
    warnings.push(...simulation.warnings)

    if (policy.requireFromAddress && !simulation.from) {
      reasons.push('operator/from address is required for preflight simulation')
    }

    if (!simulation.ok) {
      if (policy.requirePreflight) {
        reasons.push(simulation.errorReason ?? 'preflight simulation failed')
      } else {
        warnings.push(simulation.errorReason ?? 'preflight simulation failed')
      }
    }

    if (policy.maxEstimatedGas && simulation.gasEstimate) {
      const estimate = safeBigInt(simulation.gasEstimate)
      const ceiling = safeBigInt(policy.maxEstimatedGas)
      if (ceiling > 0n && estimate > ceiling) {
        reasons.push(`estimated gas ${estimate.toString()} exceeds configured ceiling ${ceiling.toString()}`)
      }
    }
  }

  return {
    approved: reasons.length === 0,
    policy: {
      requirePreflight: policy.requirePreflight,
      requireFromAddress: policy.requireFromAddress,
      blockTag: policy.blockTag,
      maxEstimatedGas: policy.maxEstimatedGas,
    },
    reasons,
    warnings: [...new Set(warnings)],
  }
}

function parseBoolean(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(value ?? '')
}

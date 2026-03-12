import type { ExecutionJob, ExecutionStatus } from '@mde/domain'
import type { ExecutionSignerSubmitOptions } from './signer.js'

export type ExecutionReplacementPolicy = {
  enabled: boolean
  maxAttempts: number
  minPendingMs: number
  gasBumpBps: number
  retryOnTimeout: boolean
}

export type ExecutionReplacementDecision = {
  replace: boolean
  reason: string
  policy: ExecutionReplacementPolicy
}

export function loadExecutionReplacementPolicy(env: NodeJS.ProcessEnv = process.env): ExecutionReplacementPolicy {
  return {
    enabled: parseBoolean(env.EXECUTION_REPLACEMENT_ENABLED, true),
    maxAttempts: parsePositiveInteger(env.EXECUTION_REPLACEMENT_MAX_ATTEMPTS, 3, 1),
    minPendingMs: parsePositiveInteger(env.EXECUTION_REPLACEMENT_MIN_AGE_MS, 30_000, 0),
    gasBumpBps: parsePositiveInteger(env.EXECUTION_REPLACEMENT_GAS_BUMP_BPS, 11_250, 10_000),
    retryOnTimeout: parseBoolean(env.EXECUTION_REPLACEMENT_RETRY_ON_TIMEOUT, true),
  }
}

export function shouldReplaceExecution(
  job: ExecutionJob,
  status: ExecutionStatus | undefined,
  policy: ExecutionReplacementPolicy = loadExecutionReplacementPolicy(),
  nowMs = Date.now()
): ExecutionReplacementDecision {
  if (!policy.enabled) {
    return { replace: false, reason: 'replacement_disabled', policy }
  }

  if (!job.submittedTxHash || isZeroHash(job.submittedTxHash)) {
    return { replace: false, reason: 'job_not_submitted', policy }
  }

  if (job.submittedVia === 'mock' || job.submittedVia === 'external' || job.submittedVia === 'not_submitted') {
    return { replace: false, reason: 'non_rpc_submission', policy }
  }

  if (!status) {
    return { replace: false, reason: 'status_unavailable', policy }
  }

  if (status.status === 'prepared' || status.status === 'confirmed' || status.status === 'failed') {
    return { replace: false, reason: 'terminal_status', policy }
  }

  if (!status.transaction || status.transaction.nonce === undefined) {
    return { replace: false, reason: 'transaction_context_unavailable', policy }
  }

  const attempts = job.submitAttempts ?? 1
  if (attempts >= policy.maxAttempts) {
    return { replace: false, reason: 'max_attempts_exhausted', policy }
  }

  const timedOut = status.warnings?.includes('receipt_wait_timeout') ?? false
  if (timedOut && !policy.retryOnTimeout) {
    return { replace: false, reason: 'timeout_retry_disabled', policy }
  }

  const lastSubmittedMs = job.lastSubmittedMs ?? job.lastUpdatedMs ?? status.observedAtMs ?? 0
  const ageMs = Math.max(0, nowMs - lastSubmittedMs)
  if (!timedOut && ageMs < policy.minPendingMs) {
    return { replace: false, reason: 'pending_age_below_threshold', policy }
  }

  return {
    replace: true,
    reason: timedOut ? 'receipt_wait_timeout' : 'pending_age_threshold_met',
    policy,
  }
}

export function createReplacementSubmitOptions(
  status: ExecutionStatus,
  policy: ExecutionReplacementPolicy = loadExecutionReplacementPolicy()
): ExecutionSignerSubmitOptions {
  const transaction = status.transaction
  if (!transaction || transaction.nonce === undefined) {
    throw new Error('replacement_transaction_unavailable')
  }

  return {
    from: transaction.from,
    chainId: transaction.chainId,
    nonce: transaction.nonce,
    gas: transaction.gas,
    gasPrice: bumpDecimal(transaction.gasPrice, policy.gasBumpBps),
    maxPriorityFeePerGas: bumpDecimal(transaction.maxPriorityFeePerGas, policy.gasBumpBps),
    maxFeePerGas: bumpDecimal(transaction.maxFeePerGas, policy.gasBumpBps),
    gasLimitMultiplierBps: 10_000,
  }
}

function bumpDecimal(value: string | undefined, bps: number): string | undefined {
  if (!value) return undefined
  const amount = BigInt(value)
  return ((amount * BigInt(bps) + 9_999n) / 10_000n).toString()
}

function isZeroHash(txHash: string): boolean {
  return /^0x0{64}$/i.test(txHash)
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return /^(1|true|yes|on)$/i.test(value)
}

function parsePositiveInteger(value: string | undefined, fallback: number, min: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, parsed)
}

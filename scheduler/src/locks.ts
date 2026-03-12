import type { ExecutionJob } from '@mde/domain'

export function deriveLocks(job: ExecutionJob): string[] {
  return [
    `wallet:${job.walletContext}:nonce`,
    ...job.chainLocks.map((lock) => `chain:${lock}`),
    ...job.protocolLocks.map((lock) => `protocol:${lock}`),
    ...(job.bridgeId ? [`bridge:${job.bridgeId}`] : []),
  ]
}

export function sharesLock(a: ExecutionJob, b: ExecutionJob): boolean {
  const aLocks = new Set(deriveLocks(a))
  return deriveLocks(b).some((lock) => aLocks.has(lock))
}

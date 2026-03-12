import type { ExecutionJob, ExecutionPayload, ExecutionStatus } from '@mde/domain'
import type { ExecutionMonitorOptions } from './receipts.js'
import { ExecutionEngine } from './engine.js'
import { loadExecutionReplacementPolicy, shouldReplaceExecution, type ExecutionReplacementPolicy } from './replacement.js'

export type ExecutionBackfillStore = {
  listJobs(): ExecutionJob[]
  getJob(jobId: string): ExecutionJob | undefined
  getExecutionStatus(jobId: string): ExecutionStatus | undefined
  getExecutionPayload(jobId: string): ExecutionPayload | undefined
  saveExecutionStatus(jobId: string, status: ExecutionStatus): void
  appendLog?(entry: Record<string, unknown>): void
}

export type ExecutionBackfillOptions = ExecutionMonitorOptions & {
  jobId?: string
  statuses?: ExecutionJob['status'][]
  limit?: number
  waitForReceipt?: boolean
  replacementPolicy?: ExecutionReplacementPolicy
  forceReplace?: boolean
}

export type ExecutionBackfillResult = {
  jobId: string
  chainKey?: string
  txHash?: string
  beforeStatus?: ExecutionStatus['status']
  afterStatus?: ExecutionStatus['status']
  replaced: boolean
  replacementTxHash?: string
  skippedReason?: string
}

const DEFAULT_JOB_STATUSES: ExecutionJob['status'][] = ['submitted', 'pending', 'confirmed']

export async function backfillExecutionStatuses(
  store: ExecutionBackfillStore,
  engine: ExecutionEngine,
  options: ExecutionBackfillOptions = {}
): Promise<ExecutionBackfillResult[]> {
  const policy = options.replacementPolicy ?? loadExecutionReplacementPolicy()
  const requestedStatuses = options.statuses?.length ? options.statuses : DEFAULT_JOB_STATUSES
  const limit = Math.max(1, Math.trunc(options.limit ?? Number.MAX_SAFE_INTEGER))
  const jobs = (options.jobId ? [store.getJob(options.jobId)].filter(Boolean) : store.listJobs()) as ExecutionJob[]

  const results: ExecutionBackfillResult[] = []

  for (const job of jobs) {
    if (results.length >= limit) break
    if (!requestedStatuses.includes(job.status)) continue

    const txHash = job.submittedTxHash
    const chainKey = job.executionChainKey
    const previousStatus = store.getExecutionStatus(job.jobId)

    if (job.submittedVia === 'mock' || job.submittedVia === 'external' || job.submittedVia === 'not_submitted') {
      results.push({
        jobId: job.jobId,
        chainKey,
        txHash,
        beforeStatus: previousStatus?.status,
        afterStatus: previousStatus?.status,
        replaced: false,
        skippedReason: 'non_rpc_submission',
      })
      continue
    }

    if (!chainKey || !txHash || isZeroHash(txHash)) {
      results.push({
        jobId: job.jobId,
        chainKey,
        txHash,
        beforeStatus: previousStatus?.status,
        afterStatus: previousStatus?.status,
        replaced: false,
        skippedReason: 'job_not_trackable',
      })
      continue
    }

    try {
      const monitored = await engine.monitor(chainKey, txHash, {
        chainRegistry: options.chainRegistry,
        transport: options.transport,
        rpcUrl: options.rpcUrl,
        requiredConfirmations: options.requiredConfirmations,
        pollIntervalMs: options.pollIntervalMs,
        timeoutMs: options.timeoutMs,
      })
      store.saveExecutionStatus(job.jobId, monitored)

      let afterStatus = monitored
      let replaced = false
      let replacementTxHash: string | undefined
      let skippedReason: string | undefined

      const latestJob = store.getJob(job.jobId) ?? job
      const payload = store.getExecutionPayload(job.jobId)
      const decision = shouldReplaceExecution(latestJob, monitored, policy)

      if (payload && (options.forceReplace || decision.replace)) {
        const replacement = await engine.replace(latestJob, payload, monitored, {
          chainRegistry: options.chainRegistry,
          transport: options.transport,
          rpcUrl: options.rpcUrl,
          requiredConfirmations: options.requiredConfirmations,
          pollIntervalMs: options.pollIntervalMs,
          timeoutMs: options.timeoutMs,
          waitForReceipt: options.waitForReceipt,
          replacementPolicy: policy,
          force: options.forceReplace,
        })
        store.saveExecutionStatus(job.jobId, replacement)
        afterStatus = replacement
        replaced = Boolean(replacement.replacementForTxHash && replacement.txHash !== replacement.replacementForTxHash)
        replacementTxHash = replaced ? replacement.txHash : undefined
      } else if (!payload) {
        skippedReason = 'execution_payload_unavailable'
      } else if (!options.forceReplace) {
        skippedReason = decision.reason
      }

      store.appendLog?.({
        kind: 'execution_backfill',
        jobId: job.jobId,
        chainKey,
        txHash,
        beforeStatus: previousStatus?.status,
        afterStatus: afterStatus.status,
        replaced,
        replacementTxHash,
        skippedReason,
      })

      results.push({
        jobId: job.jobId,
        chainKey,
        txHash,
        beforeStatus: previousStatus?.status,
        afterStatus: afterStatus.status,
        replaced,
        replacementTxHash,
        skippedReason,
      })
    } catch (error) {
      const errorReason = error instanceof Error ? error.message : String(error)
      store.appendLog?.({
        kind: 'execution_backfill_failed',
        jobId: job.jobId,
        chainKey,
        txHash,
        errorReason,
      })
      results.push({
        jobId: job.jobId,
        chainKey,
        txHash,
        beforeStatus: previousStatus?.status,
        afterStatus: previousStatus?.status,
        replaced: false,
        skippedReason: errorReason,
      })
    }
  }

  return results
}

function isZeroHash(txHash: string): boolean {
  return /^0x0{64}$/i.test(txHash)
}

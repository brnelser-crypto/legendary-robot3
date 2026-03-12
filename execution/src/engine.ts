import { ChainRegistry } from '@mde/chains'
import type { ExecutionJob, ExecutionPayload, ExecutionSimulation, ExecutionStatus, ExecutionTransactionRequest } from '@mde/domain'
import { createLogger } from '@mde/monitoring'
import { decodeCalldataEnvelope } from '@mde/protocols'
import {
  createReplacementSubmitOptions,
  loadExecutionReplacementPolicy,
  shouldReplaceExecution,
  type ExecutionReplacementPolicy,
} from './replacement.js'
import { monitorExecutionTransaction, waitForExecutionReceipt, type ExecutionMonitorOptions } from './receipts.js'
import { decideExecutionPreflight, loadExecutionPreflightPolicy, type ExecutionPreflightPolicy } from './policy.js'
import {
  createExecutionSigner,
  loadExecutionSignerConfig,
  type ExecutionSigner,
  type ExecutionSignerConfig,
  type ExecutionSignerSubmitOptions,
} from './signer.js'
import { simulateExecutionPayload, type ExecutionSimulationOptions } from './simulation.js'
import { resolveExecutionTransport } from './transactions.js'

const ZERO_TX_HASH = `0x${'0'.repeat(64)}`

export type ExecutionEngineOptions = {
  chainRegistry?: ChainRegistry
  preflightPolicy?: ExecutionPreflightPolicy
  signerConfig?: ExecutionSignerConfig
  signer?: ExecutionSigner
  replacementPolicy?: ExecutionReplacementPolicy
  simulatePayload?: (payload: ExecutionPayload, options?: ExecutionSimulationOptions) => Promise<ExecutionSimulation>
}

export type ExecutionSubmitOptions = ExecutionSignerSubmitOptions
export type ExecutionPrepareOptions = ExecutionSignerSubmitOptions
export type ExecutionReplaceOptions = ExecutionSubmitOptions & {
  replacementPolicy?: ExecutionReplacementPolicy
  force?: boolean
}

export class ExecutionEngine {
  private readonly logger = createLogger('execution-engine')
  private readonly chainRegistry: ChainRegistry
  private readonly preflightPolicy: ExecutionPreflightPolicy
  private readonly signerConfig: ExecutionSignerConfig
  private readonly signer: ExecutionSigner
  private readonly replacementPolicy: ExecutionReplacementPolicy
  private readonly simulatePayloadFn: (payload: ExecutionPayload, options?: ExecutionSimulationOptions) => Promise<ExecutionSimulation>

  constructor(options: ExecutionEngineOptions = {}) {
    this.chainRegistry = options.chainRegistry ?? new ChainRegistry()
    this.preflightPolicy = options.preflightPolicy ?? loadExecutionPreflightPolicy()
    this.signerConfig = options.signerConfig ?? loadExecutionSignerConfig()
    this.signer = options.signer ?? createExecutionSigner(this.signerConfig)
    this.replacementPolicy = options.replacementPolicy ?? loadExecutionReplacementPolicy()
    this.simulatePayloadFn = options.simulatePayload ?? simulateExecutionPayload
  }

  async simulate(job: ExecutionJob, payload: ExecutionPayload, options: ExecutionSimulationOptions = {}): Promise<ExecutionSimulation> {
    const simulation = await this.simulatePayloadFn(payload, {
      chainRegistry: options.chainRegistry ?? this.chainRegistry,
      blockTag: options.blockTag ?? this.preflightPolicy.blockTag,
      transport: options.transport,
      rpcUrl: options.rpcUrl,
      from: options.from,
    })

    this.logger.info('job_simulated', {
      jobId: job.jobId,
      chainKey: payload.chainKey,
      ok: simulation.ok,
      method: simulation.method,
      gasEstimate: simulation.gasEstimate,
      errorReason: simulation.errorReason,
    })

    return simulation
  }

  async prepareTransaction(
    job: ExecutionJob,
    payload: ExecutionPayload,
    options: ExecutionPrepareOptions = {}
  ): Promise<ExecutionTransactionRequest> {
    const transaction = await this.signer.prepareTransaction(payload, {
      ...options,
      chainRegistry: options.chainRegistry ?? this.chainRegistry,
    })

    this.logger.info('job_transaction_prepared', {
      jobId: job.jobId,
      chainKey: payload.chainKey,
      to: transaction.to,
      nonce: transaction.nonce,
      type: transaction.type,
      gas: transaction.gas,
    })

    return transaction
  }

  async monitor(chainKey: string, txHash: string, options: ExecutionMonitorOptions = {}): Promise<ExecutionStatus> {
    const status = await monitorExecutionTransaction(chainKey, txHash, {
      chainRegistry: options.chainRegistry ?? this.chainRegistry,
      transport: options.transport,
      rpcUrl: options.rpcUrl,
      requiredConfirmations: options.requiredConfirmations,
      pollIntervalMs: options.pollIntervalMs,
      timeoutMs: options.timeoutMs,
    })

    this.logger.info('tx_monitored', {
      chainKey,
      txHash,
      status: status.status,
      confirmations: status.confirmations,
      blockNumber: status.blockNumber,
      errorReason: status.errorReason,
    })

    return status
  }

  async waitForReceipt(chainKey: string, txHash: string, options: ExecutionMonitorOptions = {}): Promise<ExecutionStatus> {
    const status = await waitForExecutionReceipt(chainKey, txHash, {
      chainRegistry: options.chainRegistry ?? this.chainRegistry,
      transport: options.transport,
      rpcUrl: options.rpcUrl,
      requiredConfirmations: options.requiredConfirmations,
      pollIntervalMs: options.pollIntervalMs,
      timeoutMs: options.timeoutMs,
    })

    this.logger.info('tx_receipt_wait_complete', {
      chainKey,
      txHash,
      status: status.status,
      confirmations: status.confirmations,
      errorReason: status.errorReason,
    })

    return status
  }

  async submit(job: ExecutionJob, payload: ExecutionPayload, options: ExecutionSubmitOptions = {}): Promise<ExecutionStatus> {
    const decoded = this.decodePayload(payload.data)
    const simulation = await this.simulate(job, payload, options)
    const preflight = decideExecutionPreflight(payload, simulation, this.preflightPolicy)

    if (!preflight.approved) {
      this.logger.warn('job_preflight_failed', {
        jobId: job.jobId,
        chainKey: payload.chainKey,
        to: payload.to,
        method: payload.method ?? decoded?.method,
        reasons: preflight.reasons,
        warnings: preflight.warnings,
      })

      return {
        txHash: ZERO_TX_HASH,
        status: 'failed',
        errorReason: preflight.reasons.join('; '),
        simulation,
        preflight,
        submittedVia: 'not_submitted',
        warnings: preflight.warnings,
        observedAtMs: Date.now(),
      }
    }

    try {
      const status = await this.signer.submit(payload, {
        ...options,
        chainRegistry: options.chainRegistry ?? this.chainRegistry,
      })

      const warnings = mergeWarnings(preflight.warnings, status.warnings)
      const mergedStatus: ExecutionStatus = {
        ...status,
        simulation,
        preflight,
        warnings,
      }

      this.logger.info('job_submitted', {
        jobId: job.jobId,
        chainKey: payload.chainKey,
        to: payload.to,
        method: payload.method ?? decoded?.method,
        kind: decoded?.kind,
        summary: payload.summary ?? decoded,
        gasEstimate: simulation.gasEstimate,
        txHash: mergedStatus.txHash,
        submittedVia: mergedStatus.submittedVia,
        status: mergedStatus.status,
        blockNumber: mergedStatus.blockNumber,
      })

      return mergedStatus
    } catch (error) {
      const errorReason = error instanceof Error ? error.message : String(error)
      this.logger.error('job_submission_failed', {
        jobId: job.jobId,
        chainKey: payload.chainKey,
        to: payload.to,
        method: payload.method ?? decoded?.method,
        errorReason,
      })

      return {
        txHash: ZERO_TX_HASH,
        status: 'failed',
        errorReason,
        simulation,
        preflight,
        submittedVia: 'not_submitted',
        warnings: preflight.warnings,
        observedAtMs: Date.now(),
      }
    }
  }

  async submitRaw(chainKey: string, rawTransaction: string, options: ExecutionSubmitOptions = {}): Promise<ExecutionStatus> {
    if (!rawTransaction.startsWith('0x')) {
      throw new Error('raw_transaction_invalid')
    }

    const { transport, rpcUrl } = resolveExecutionTransport(chainKey, {
      chainRegistry: options.chainRegistry ?? this.chainRegistry,
      transport: options.transport,
      rpcUrl: options.rpcUrl,
    })

    if (!transport) {
      throw new Error(`rpc_unavailable:${chainKey}`)
    }

    const observedAtMs = Date.now()
    const result = await transport.request('eth_sendRawTransaction', [rawTransaction])
    if (typeof result !== 'string') {
      throw new Error('RPC eth_sendRawTransaction did not return a transaction hash')
    }

    const shouldWait = options.waitForReceipt ?? this.signerConfig.receiptPolicy.waitForReceipt
    if (!shouldWait) {
      return {
        txHash: result,
        status: 'submitted',
        rpcUrl,
        observedAtMs,
        submittedVia: 'rpc_sendRawTransaction',
      }
    }

    const monitored = await waitForExecutionReceipt(chainKey, result, {
      chainRegistry: options.chainRegistry ?? this.chainRegistry,
      transport,
      rpcUrl,
      requiredConfirmations: options.requiredConfirmations ?? this.signerConfig.receiptPolicy.confirmations,
      pollIntervalMs: options.pollIntervalMs ?? this.signerConfig.receiptPolicy.pollIntervalMs,
      timeoutMs: options.timeoutMs ?? this.signerConfig.receiptPolicy.timeoutMs,
    })

    return {
      ...monitored,
      rpcUrl: monitored.rpcUrl ?? rpcUrl,
      observedAtMs: monitored.observedAtMs ?? observedAtMs,
      submittedVia: 'rpc_sendRawTransaction',
    }
  }

  async replace(
    job: ExecutionJob,
    payload: ExecutionPayload,
    previousStatus: ExecutionStatus | undefined,
    options: ExecutionReplaceOptions = {}
  ): Promise<ExecutionStatus> {
    if (!previousStatus) {
      return {
        txHash: ZERO_TX_HASH,
        status: 'failed',
        errorReason: 'replacement_status_unavailable',
        submittedVia: 'not_submitted',
        observedAtMs: Date.now(),
        warnings: ['replacement_failed:replacement_status_unavailable'],
      }
    }

    const policy = options.replacementPolicy ?? this.replacementPolicy
    const decision = shouldReplaceExecution(job, previousStatus, policy)
    if (!options.force && !decision.replace) {
      return {
        ...previousStatus,
        observedAtMs: Date.now(),
        warnings: mergeWarnings(previousStatus.warnings, [`replacement_skipped:${decision.reason}`]),
      }
    }

    try {
      const replacementOptions = createReplacementSubmitOptions(previousStatus, policy)
      const replacementStatus = await this.submit(job, payload, {
        ...options,
        ...replacementOptions,
        chainRegistry: options.chainRegistry ?? this.chainRegistry,
      })

      return {
        ...replacementStatus,
        replacementForTxHash: previousStatus.txHash,
        warnings: mergeWarnings(
          replacementStatus.warnings,
          [`replacement_reason:${options.force ? 'forced' : decision.reason}`]
        ),
      }
    } catch (error) {
      const errorReason = error instanceof Error ? error.message : String(error)
      return {
        ...previousStatus,
        errorReason,
        observedAtMs: Date.now(),
        warnings: mergeWarnings(previousStatus.warnings, [`replacement_failed:${errorReason}`]),
      }
    }
  }

  private decodePayload(data: string): Record<string, unknown> | undefined {
    const envelope = decodeCalldataEnvelope(data)
    if (envelope) {
      return {
        kind: 'evm_calldata',
        ...envelope,
      }
    }

    try {
      const raw = data.startsWith('0x') ? Buffer.from(data.slice(2), 'hex').toString('utf8') : data
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          kind: 'json',
          ...(parsed as Record<string, unknown>),
        }
      }
    } catch {
      // best-effort only
    }

    return undefined
  }
}

function mergeWarnings(...groups: Array<string[] | undefined>): string[] | undefined {
  const merged = [...new Set(groups.flatMap((group) => group ?? []))]
  return merged.length > 0 ? merged : undefined
}

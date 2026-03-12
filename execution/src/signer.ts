import { createHash } from 'node:crypto'
import type { ExecutionPayload, ExecutionStatus, ExecutionTransactionRequest } from '@mde/domain'
import { isHexAddress } from '@mde/protocols'
import { waitForExecutionReceipt } from './receipts.js'
import {
  createExecutionTransactionRequest,
  populateExecutionTransactionRequest,
  resolveExecutionTransport,
  serializeRpcTransactionRequest,
  type ExecutionTransportOptions,
} from './transactions.js'

const ZERO_TX_HASH = `0x${'0'.repeat(64)}`

export type ExecutionSignerMode = 'mock' | 'rpc_unlocked' | 'raw' | 'external'

export type ExecutionReceiptPolicy = {
  waitForReceipt: boolean
  confirmations: number
  pollIntervalMs: number
  timeoutMs: number
}

export type ExecutionSignerConfig = {
  mode: ExecutionSignerMode
  defaultFrom?: string
  gasLimitMultiplierBps: number
  receiptPolicy: ExecutionReceiptPolicy
}

export type ExecutionSignerSubmitOptions = ExecutionTransportOptions & {
  from?: string
  waitForReceipt?: boolean
  requiredConfirmations?: number
  pollIntervalMs?: number
  timeoutMs?: number
  chainId?: number
  nonce?: number
  gas?: string
  gasPrice?: string
  maxPriorityFeePerGas?: string
  maxFeePerGas?: string
  gasLimitMultiplierBps?: number
}

export type RawTransactionFactory = (request: ExecutionTransactionRequest) => Promise<string>

export interface ExecutionSigner {
  readonly mode: ExecutionSignerMode
  prepareTransaction(payload: ExecutionPayload, options?: ExecutionSignerSubmitOptions): Promise<ExecutionTransactionRequest>
  submit(payload: ExecutionPayload, options?: ExecutionSignerSubmitOptions): Promise<ExecutionStatus>
}

export class MockExecutionSigner implements ExecutionSigner {
  readonly mode = 'mock' as const

  constructor(private readonly config: ExecutionSignerConfig = loadExecutionSignerConfig()) {}

  async prepareTransaction(payload: ExecutionPayload, options: ExecutionSignerSubmitOptions = {}): Promise<ExecutionTransactionRequest> {
    if (!isHexAddress(payload.to)) {
      throw new Error(`invalid_target_address:${payload.to}`)
    }

    const fallbackFrom = isHexAddress(payload.from)
      ? payload.from
      : isHexAddress(options.from)
        ? options.from
        : isHexAddress(this.config.defaultFrom)
          ? this.config.defaultFrom
          : '0x0000000000000000000000000000000000000000'

    return {
      chainKey: payload.chainKey,
      chainId: options.chainId,
      type: 'legacy',
      from: fallbackFrom,
      to: payload.to,
      value: payload.value || '0',
      data: payload.data,
    }
  }

  async submit(payload: ExecutionPayload, options: ExecutionSignerSubmitOptions = {}): Promise<ExecutionStatus> {
    const transaction = await this.prepareTransaction(payload, options)
    const digest = createHash('sha256').update(JSON.stringify(serializeRpcTransactionRequest(transaction))).digest('hex')
    const warnings: string[] = []

    if (transaction.from === '0x0000000000000000000000000000000000000000') {
      warnings.push('mock_signer_from_defaulted')
    }

    if (options.waitForReceipt ?? this.config.receiptPolicy.waitForReceipt) {
      warnings.push('mock_signer_receipts_unavailable')
    }

    return {
      txHash: `0x${digest}`,
      status: 'submitted',
      transaction,
      nonce: transaction.nonce,
      observedAtMs: Date.now(),
      submittedVia: 'mock',
      warnings,
    }
  }
}

export class RpcUnlockedExecutionSigner implements ExecutionSigner {
  readonly mode = 'rpc_unlocked' as const

  constructor(private readonly config: ExecutionSignerConfig = loadExecutionSignerConfig()) {}

  async prepareTransaction(payload: ExecutionPayload, options: ExecutionSignerSubmitOptions = {}): Promise<ExecutionTransactionRequest> {
    return preparePopulatedTransaction(payload, this.config, options)
  }

  async submit(payload: ExecutionPayload, options: ExecutionSignerSubmitOptions = {}): Promise<ExecutionStatus> {
    const transaction = await this.prepareTransaction(payload, options)
    const { transport, rpcUrl } = resolveExecutionTransport(payload.chainKey, options)
    if (!transport) {
      throw new Error(`rpc_unavailable:${payload.chainKey}`)
    }

    const result = await transport.request('eth_sendTransaction', [serializeRpcTransactionRequest(transaction)])
    if (typeof result !== 'string') {
      throw new Error('RPC eth_sendTransaction did not return a transaction hash')
    }

    return finalizeSubmittedStatus({
      chainKey: payload.chainKey,
      txHash: result,
      transaction,
      rpcUrl,
      submittedVia: 'rpc_sendTransaction',
      config: this.config,
      options,
    })
  }
}

export class RawTransactionExecutionSigner implements ExecutionSigner {
  readonly mode = 'raw' as const

  constructor(
    private readonly signTransaction: RawTransactionFactory | undefined,
    private readonly config: ExecutionSignerConfig = loadExecutionSignerConfig()
  ) {}

  async prepareTransaction(payload: ExecutionPayload, options: ExecutionSignerSubmitOptions = {}): Promise<ExecutionTransactionRequest> {
    return preparePopulatedTransaction(payload, this.config, options)
  }

  async submit(payload: ExecutionPayload, options: ExecutionSignerSubmitOptions = {}): Promise<ExecutionStatus> {
    if (!this.signTransaction) {
      throw new Error('raw_signer_callback_unavailable')
    }

    const transaction = await this.prepareTransaction(payload, options)
    const rawTransaction = await this.signTransaction(transaction)
    if (!rawTransaction.startsWith('0x')) {
      throw new Error('raw_signer_invalid_payload')
    }

    const { transport, rpcUrl } = resolveExecutionTransport(payload.chainKey, options)
    if (!transport) {
      throw new Error(`rpc_unavailable:${payload.chainKey}`)
    }

    const result = await transport.request('eth_sendRawTransaction', [rawTransaction])
    if (typeof result !== 'string') {
      throw new Error('RPC eth_sendRawTransaction did not return a transaction hash')
    }

    return finalizeSubmittedStatus({
      chainKey: payload.chainKey,
      txHash: result,
      transaction,
      rpcUrl,
      submittedVia: 'rpc_sendRawTransaction',
      config: this.config,
      options,
    })
  }
}

export class ExternalExecutionSigner implements ExecutionSigner {
  readonly mode = 'external' as const

  constructor(private readonly config: ExecutionSignerConfig = loadExecutionSignerConfig()) {}

  async prepareTransaction(payload: ExecutionPayload, options: ExecutionSignerSubmitOptions = {}): Promise<ExecutionTransactionRequest> {
    return preparePopulatedTransaction(payload, this.config, options)
  }

  async submit(payload: ExecutionPayload, options: ExecutionSignerSubmitOptions = {}): Promise<ExecutionStatus> {
    const transaction = await this.prepareTransaction(payload, options)
    const warnings = ['external_signer_submission_required']
    if (options.waitForReceipt ?? this.config.receiptPolicy.waitForReceipt) {
      warnings.push('external_signer_wait_for_receipt_deferred')
    }

    return {
      txHash: ZERO_TX_HASH,
      status: 'prepared',
      transaction,
      nonce: transaction.nonce,
      observedAtMs: Date.now(),
      submittedVia: 'external',
      warnings,
    }
  }
}

export function loadExecutionSignerConfig(env: NodeJS.ProcessEnv = process.env): ExecutionSignerConfig {
  return {
    mode: normalizeSignerMode(env.EXECUTION_SIGNER_MODE),
    defaultFrom: isHexAddress(env.ENGINE_OPERATOR_ADDRESS) ? env.ENGINE_OPERATOR_ADDRESS : undefined,
    gasLimitMultiplierBps: parsePositiveInteger(env.EXECUTION_GAS_LIMIT_BPS, 11_000, 10_000),
    receiptPolicy: {
      waitForReceipt: parseBoolean(env.EXECUTION_WAIT_FOR_RECEIPT),
      confirmations: parsePositiveInteger(env.EXECUTION_CONFIRMATIONS, 1, 1),
      pollIntervalMs: parsePositiveInteger(env.EXECUTION_RECEIPT_POLL_MS, 3_000, 0),
      timeoutMs: parsePositiveInteger(env.EXECUTION_RECEIPT_TIMEOUT_MS, 60_000, 0),
    },
  }
}

export function createExecutionSigner(
  config: ExecutionSignerConfig = loadExecutionSignerConfig(),
  options: { signRawTransaction?: RawTransactionFactory } = {}
): ExecutionSigner {
  if (config.mode === 'rpc_unlocked') {
    return new RpcUnlockedExecutionSigner(config)
  }

  if (config.mode === 'raw') {
    return new RawTransactionExecutionSigner(options.signRawTransaction, config)
  }

  if (config.mode === 'external') {
    return new ExternalExecutionSigner(config)
  }

  return new MockExecutionSigner(config)
}

async function preparePopulatedTransaction(
  payload: ExecutionPayload,
  config: ExecutionSignerConfig,
  options: ExecutionSignerSubmitOptions = {}
): Promise<ExecutionTransactionRequest> {
  const request = createExecutionTransactionRequest(payload, {
    chainRegistry: options.chainRegistry,
    from: options.from ?? config.defaultFrom,
    chainId: options.chainId,
  })

  return populateExecutionTransactionRequest(request, {
    chainRegistry: options.chainRegistry,
    transport: options.transport,
    rpcUrl: options.rpcUrl,
    chainId: options.chainId,
    nonce: options.nonce,
    gas: options.gas,
    gasPrice: options.gasPrice,
    maxPriorityFeePerGas: options.maxPriorityFeePerGas,
    maxFeePerGas: options.maxFeePerGas,
    gasLimitMultiplierBps: options.gasLimitMultiplierBps ?? config.gasLimitMultiplierBps,
  })
}

async function finalizeSubmittedStatus(options: {
  chainKey: string
  txHash: string
  transaction: ExecutionTransactionRequest
  rpcUrl?: string
  submittedVia: 'rpc_sendTransaction' | 'rpc_sendRawTransaction'
  config: ExecutionSignerConfig
  options: ExecutionSignerSubmitOptions
}): Promise<ExecutionStatus> {
  const observedAtMs = Date.now()
  const waitForReceipt = options.options.waitForReceipt ?? options.config.receiptPolicy.waitForReceipt

  if (!waitForReceipt) {
    return {
      txHash: options.txHash,
      status: 'submitted',
      transaction: options.transaction,
      nonce: options.transaction.nonce,
      rpcUrl: options.rpcUrl,
      observedAtMs,
      submittedVia: options.submittedVia,
    }
  }

  const monitored = await waitForExecutionReceipt(options.chainKey, options.txHash, {
    chainRegistry: options.options.chainRegistry,
    transport: options.options.transport,
    rpcUrl: options.rpcUrl,
    requiredConfirmations: options.options.requiredConfirmations ?? options.config.receiptPolicy.confirmations,
    pollIntervalMs: options.options.pollIntervalMs ?? options.config.receiptPolicy.pollIntervalMs,
    timeoutMs: options.options.timeoutMs ?? options.config.receiptPolicy.timeoutMs,
  })

  return {
    ...monitored,
    transaction: monitored.transaction ?? options.transaction,
    nonce: options.transaction.nonce,
    rpcUrl: monitored.rpcUrl ?? options.rpcUrl,
    observedAtMs: monitored.observedAtMs ?? observedAtMs,
    submittedVia: options.submittedVia,
  }
}

function normalizeSignerMode(value: string | undefined): ExecutionSignerMode {
  if (value === 'rpc_unlocked' || value === 'raw' || value === 'external') return value
  return 'mock'
}

function parseBoolean(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(value ?? '')
}

function parsePositiveInteger(value: string | undefined, fallback: number, min: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, parsed)
}

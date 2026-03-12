
import type { ExecutionReceipt, ExecutionStatus, ExecutionTransactionRequest } from '@mde/domain'
import { type JsonRpcTransport } from '@mde/protocols'
import { hexQuantityToDecimal, hexQuantityToNumber, resolveExecutionTransport, type ExecutionTransportOptions } from './transactions.js'

export type ExecutionMonitorOptions = ExecutionTransportOptions & {
  requiredConfirmations?: number
  pollIntervalMs?: number
  timeoutMs?: number
}

type RpcLog = {
  address?: unknown
  topics?: unknown
  data?: unknown
  logIndex?: unknown
}

type RpcReceipt = {
  transactionHash?: unknown
  blockHash?: unknown
  blockNumber?: unknown
  transactionIndex?: unknown
  contractAddress?: unknown
  gasUsed?: unknown
  cumulativeGasUsed?: unknown
  effectiveGasPrice?: unknown
  status?: unknown
  logs?: unknown
}

type RpcTransaction = {
  from?: unknown
  to?: unknown
  nonce?: unknown
  gas?: unknown
  gasPrice?: unknown
  maxPriorityFeePerGas?: unknown
  maxFeePerGas?: unknown
  value?: unknown
  input?: unknown
  type?: unknown
  chainId?: unknown
}

export async function getExecutionReceipt(
  chainKey: string,
  txHash: string,
  options: ExecutionTransportOptions = {}
): Promise<{ receipt?: ExecutionReceipt; rpcUrl?: string }> {
  const { transport, rpcUrl } = ensureExecutionTransport(chainKey, options)
  const result = await transport.request('eth_getTransactionReceipt', [txHash])
  if (!result) {
    return { receipt: undefined, rpcUrl }
  }

  if (typeof result !== 'object') {
    throw new Error('RPC eth_getTransactionReceipt did not return an object')
  }

  return {
    receipt: parseExecutionReceipt(txHash, result as RpcReceipt),
    rpcUrl,
  }
}

export async function getExecutionTransaction(
  chainKey: string,
  txHash: string,
  options: ExecutionTransportOptions = {}
): Promise<{ transaction?: ExecutionTransactionRequest; rpcUrl?: string }> {
  const { transport, rpcUrl } = ensureExecutionTransport(chainKey, options)
  const result = await transport.request('eth_getTransactionByHash', [txHash])
  if (!result) {
    return { transaction: undefined, rpcUrl }
  }

  if (typeof result !== 'object') {
    throw new Error('RPC eth_getTransactionByHash did not return an object')
  }

  return {
    transaction: parseExecutionTransaction(chainKey, result as RpcTransaction),
    rpcUrl,
  }
}

export async function monitorExecutionTransaction(
  chainKey: string,
  txHash: string,
  options: ExecutionMonitorOptions = {}
): Promise<ExecutionStatus> {
  const { transport, rpcUrl } = ensureExecutionTransport(chainKey, options)
  const requiredConfirmations = Math.max(1, Math.trunc(options.requiredConfirmations ?? 1))
  const observedAtMs = Date.now()
  const { receipt } = await getExecutionReceipt(chainKey, txHash, { transport, rpcUrl, chainRegistry: options.chainRegistry })

  if (receipt) {
    const latestBlockNumber = await getLatestBlockNumber(transport).catch(() => undefined)
    const confirmations = receipt.blockNumber
      ? latestBlockNumber !== undefined
        ? Math.max(1, latestBlockNumber - receipt.blockNumber + 1)
        : 1
      : undefined

    const status = receipt.success === false ? 'failed' : (confirmations ?? 0) >= requiredConfirmations ? 'confirmed' : 'pending'

    return {
      txHash,
      status,
      blockNumber: receipt.blockNumber,
      receipt,
      confirmations,
      errorReason: receipt.success === false ? 'transaction_reverted' : undefined,
      rpcUrl,
      observedAtMs,
    }
  }

  const { transaction } = await getExecutionTransaction(chainKey, txHash, { transport, rpcUrl, chainRegistry: options.chainRegistry })
  if (transaction) {
    return {
      txHash,
      status: 'pending',
      transaction,
      nonce: transaction.nonce,
      confirmations: 0,
      rpcUrl,
      observedAtMs,
    }
  }

  return {
    txHash,
    status: 'pending',
    confirmations: 0,
    rpcUrl,
    observedAtMs,
    errorReason: 'transaction_not_found',
    warnings: ['Transaction hash not yet visible via eth_getTransactionReceipt or eth_getTransactionByHash'],
  }
}

export async function waitForExecutionReceipt(
  chainKey: string,
  txHash: string,
  options: ExecutionMonitorOptions = {}
): Promise<ExecutionStatus> {
  const timeoutMs = Math.max(0, Math.trunc(options.timeoutMs ?? 60_000))
  const pollIntervalMs = Math.max(0, Math.trunc(options.pollIntervalMs ?? 3_000))
  const requiredConfirmations = Math.max(1, Math.trunc(options.requiredConfirmations ?? 1))
  const startedAt = Date.now()
  let lastStatus: ExecutionStatus | undefined

  while (Date.now() - startedAt <= timeoutMs) {
    lastStatus = await monitorExecutionTransaction(chainKey, txHash, {
      ...options,
      requiredConfirmations,
    })

    if (lastStatus.status === 'failed') return lastStatus
    if (lastStatus.status === 'confirmed' && (lastStatus.confirmations ?? 0) >= requiredConfirmations) {
      return lastStatus
    }

    if (pollIntervalMs <= 0) {
      break
    }

    await sleep(pollIntervalMs)
  }

  return {
    ...(lastStatus ?? {
      txHash,
      status: 'pending' as const,
      confirmations: 0,
      rpcUrl: resolveExecutionTransport(chainKey, options).rpcUrl,
      observedAtMs: Date.now(),
    }),
    status: lastStatus?.status === 'failed' ? 'failed' : 'pending',
    warnings: [...new Set([...(lastStatus?.warnings ?? []), 'receipt_wait_timeout'])],
  }
}

async function getLatestBlockNumber(transport: JsonRpcTransport): Promise<number> {
  const result = await transport.request('eth_blockNumber', [])
  if (typeof result !== 'string') {
    throw new Error('RPC eth_blockNumber did not return a hex quantity')
  }
  return hexQuantityToNumber(result)
}

function parseExecutionReceipt(txHash: string, raw: RpcReceipt): ExecutionReceipt {
  const logs = Array.isArray(raw.logs)
    ? raw.logs.map((log) => parseExecutionLog(log as RpcLog))
    : []

  return {
    txHash,
    blockHash: typeof raw.blockHash === 'string' ? raw.blockHash : undefined,
    blockNumber: typeof raw.blockNumber === 'string' ? hexQuantityToNumber(raw.blockNumber) : undefined,
    transactionIndex: typeof raw.transactionIndex === 'string' ? hexQuantityToNumber(raw.transactionIndex) : undefined,
    contractAddress: typeof raw.contractAddress === 'string' && raw.contractAddress ? raw.contractAddress : undefined,
    gasUsed: typeof raw.gasUsed === 'string' ? hexQuantityToDecimal(raw.gasUsed) : undefined,
    cumulativeGasUsed:
      typeof raw.cumulativeGasUsed === 'string' ? hexQuantityToDecimal(raw.cumulativeGasUsed) : undefined,
    effectiveGasPrice:
      typeof raw.effectiveGasPrice === 'string' ? hexQuantityToDecimal(raw.effectiveGasPrice) : undefined,
    success: typeof raw.status === 'string' ? hexQuantityToNumber(raw.status) !== 0 : undefined,
    logs,
  }
}

function parseExecutionLog(raw: RpcLog) {
  return {
    address: typeof raw.address === 'string' ? raw.address : '0x0000000000000000000000000000000000000000',
    topics: Array.isArray(raw.topics) ? raw.topics.filter((item): item is string => typeof item === 'string') : [],
    data: typeof raw.data === 'string' ? raw.data : '0x',
    logIndex: typeof raw.logIndex === 'string' ? hexQuantityToNumber(raw.logIndex) : undefined,
  }
}

function parseExecutionTransaction(chainKey: string, raw: RpcTransaction): ExecutionTransactionRequest {
  return {
    chainKey,
    chainId: typeof raw.chainId === 'string' ? hexQuantityToNumber(raw.chainId) : undefined,
    type: raw.type === '0x2' ? 'eip1559' : 'legacy',
    from: typeof raw.from === 'string' ? raw.from : '0x0000000000000000000000000000000000000000',
    to: typeof raw.to === 'string' ? raw.to : undefined,
    nonce: typeof raw.nonce === 'string' ? hexQuantityToNumber(raw.nonce) : undefined,
    gas: typeof raw.gas === 'string' ? hexQuantityToDecimal(raw.gas) : undefined,
    gasPrice: typeof raw.gasPrice === 'string' ? hexQuantityToDecimal(raw.gasPrice) : undefined,
    maxPriorityFeePerGas:
      typeof raw.maxPriorityFeePerGas === 'string' ? hexQuantityToDecimal(raw.maxPriorityFeePerGas) : undefined,
    maxFeePerGas: typeof raw.maxFeePerGas === 'string' ? hexQuantityToDecimal(raw.maxFeePerGas) : undefined,
    value: typeof raw.value === 'string' ? hexQuantityToDecimal(raw.value) : '0',
    data: typeof raw.input === 'string' ? raw.input : '0x',
  }
}

function ensureExecutionTransport(chainKey: string, options: ExecutionTransportOptions): { transport: JsonRpcTransport; rpcUrl?: string } {
  const resolved = resolveExecutionTransport(chainKey, options)
  if (!resolved.transport) {
    throw new Error(`rpc_unavailable:${chainKey}`)
  }

  return {
    transport: resolved.transport,
    rpcUrl: resolved.rpcUrl,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

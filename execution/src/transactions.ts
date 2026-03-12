
import { ChainRegistry } from '@mde/chains'
import type { ExecutionPayload, ExecutionTransactionRequest } from '@mde/domain'
import { FetchJsonRpcTransport, isHexAddress, resolveRpcUrl, type JsonRpcTransport } from '@mde/protocols'
import { resolveSimulationFromAddress } from './simulation.js'

export type ExecutionTransportOptions = {
  chainRegistry?: ChainRegistry
  transport?: JsonRpcTransport
  rpcUrl?: string
}

export type ExecutionTransportResolution = {
  chainRegistry: ChainRegistry
  rpcUrl?: string
  transport?: JsonRpcTransport
}

export type ExecutionTransactionPopulationOptions = ExecutionTransportOptions & {
  chainId?: number
  nonce?: number
  gas?: string
  gasPrice?: string
  maxPriorityFeePerGas?: string
  maxFeePerGas?: string
  gasLimitMultiplierBps?: number
}

export function resolveExecutionTransport(chainKey: string, options: ExecutionTransportOptions = {}): ExecutionTransportResolution {
  const chainRegistry = options.chainRegistry ?? new ChainRegistry()
  const chain = chainRegistry.get(chainKey)
  const rpcUrl = options.rpcUrl ?? resolveRpcUrl(chainKey, chain?.rpcUrls ?? [])
  const transport = options.transport ?? (rpcUrl ? new FetchJsonRpcTransport(rpcUrl) : undefined)

  return {
    chainRegistry,
    rpcUrl,
    transport,
  }
}

export function createExecutionTransactionRequest(
  payload: ExecutionPayload,
  options: { chainRegistry?: ChainRegistry; from?: string; chainId?: number } = {}
): ExecutionTransactionRequest {
  if (!isHexAddress(payload.to)) {
    throw new Error(`invalid_target_address:${payload.to}`)
  }

  const chainRegistry = options.chainRegistry ?? new ChainRegistry()
  const chain = chainRegistry.get(payload.chainKey)
  const from = isHexAddress(payload.from)
    ? payload.from
    : isHexAddress(options.from)
      ? options.from
      : resolveSimulationFromAddress(payload.chainKey)

  if (!from) {
    throw new Error('signer_from_address_unavailable')
  }

  return {
    chainKey: payload.chainKey,
    chainId: options.chainId ?? chain?.chainId,
    type: 'legacy',
    from,
    to: payload.to,
    value: normalizeDecimalQuantity(payload.value),
    data: payload.data,
  }
}

export async function populateExecutionTransactionRequest(
  request: ExecutionTransactionRequest,
  options: ExecutionTransactionPopulationOptions = {}
): Promise<ExecutionTransactionRequest> {
  const { transport } = resolveExecutionTransport(request.chainKey, options)
  const gasLimitMultiplierBps = clampMultiplier(options.gasLimitMultiplierBps)

  let chainId = request.chainId ?? options.chainId
  if (chainId === undefined && transport) {
    chainId = hexQuantityToNumber(await requestHexQuantity(transport, 'eth_chainId', []))
  }

  let nonce = request.nonce ?? options.nonce
  if (nonce === undefined && transport) {
    nonce = hexQuantityToNumber(await requestHexQuantity(transport, 'eth_getTransactionCount', [request.from, 'pending']))
  }

  let gas = request.gas ?? options.gas
  if (!gas && transport) {
    const estimate = hexQuantityToDecimal(
      await requestHexQuantity(transport, 'eth_estimateGas', [
        {
          from: request.from,
          to: request.to,
          data: request.data,
          value: decimalToHexQuantity(request.value),
        },
      ])
    )
    gas = applyMultiplierBps(estimate, gasLimitMultiplierBps)
  }

  let gasPrice = request.gasPrice ?? options.gasPrice
  if (!gasPrice && transport && !(request.maxFeePerGas ?? options.maxFeePerGas)) {
    gasPrice = hexQuantityToDecimal(await requestHexQuantity(transport, 'eth_gasPrice', []))
  }

  return {
    ...request,
    chainId,
    nonce,
    gas,
    gasPrice,
    maxPriorityFeePerGas: request.maxPriorityFeePerGas ?? options.maxPriorityFeePerGas,
    maxFeePerGas: request.maxFeePerGas ?? options.maxFeePerGas,
    type: request.maxFeePerGas || options.maxFeePerGas ? 'eip1559' : request.type ?? 'legacy',
  }
}

export function serializeRpcTransactionRequest(request: ExecutionTransactionRequest): Record<string, string> {
  const tx: Record<string, string> = {
    from: request.from,
    value: decimalToHexQuantity(request.value),
    data: request.data,
  }

  if (request.to) tx.to = request.to
  if (request.nonce !== undefined) tx.nonce = decimalToHexQuantity(request.nonce)
  if (request.gas) tx.gas = decimalToHexQuantity(request.gas)
  if (request.gasPrice) tx.gasPrice = decimalToHexQuantity(request.gasPrice)
  if (request.chainId !== undefined) tx.chainId = decimalToHexQuantity(request.chainId)

  if (request.maxPriorityFeePerGas) {
    tx.maxPriorityFeePerGas = decimalToHexQuantity(request.maxPriorityFeePerGas)
  }

  if (request.maxFeePerGas) {
    tx.maxFeePerGas = decimalToHexQuantity(request.maxFeePerGas)
    tx.type = '0x2'
  }

  return tx
}

export function decimalToHexQuantity(value: string | number | bigint | undefined): string {
  return `0x${normalizeBigInt(value).toString(16)}`
}

export function hexQuantityToDecimal(value: string): string {
  return normalizeBigInt(value).toString()
}

export function hexQuantityToNumber(value: string): number {
  const numeric = Number(normalizeBigInt(value))
  return Number.isFinite(numeric) ? numeric : 0
}

export function normalizeDecimalQuantity(value: string | number | bigint | undefined): string {
  return normalizeBigInt(value).toString()
}

async function requestHexQuantity(transport: JsonRpcTransport, method: string, params: unknown[] = []): Promise<string> {
  const result = await transport.request(method, params)
  if (typeof result !== 'string') {
    throw new Error(`RPC ${method} did not return a hex quantity`)
  }
  return result
}

function normalizeBigInt(value: string | number | bigint | undefined): bigint {
  if (value === undefined || value === null || value === '') return 0n
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(Math.trunc(value))
  return BigInt(value)
}

function applyMultiplierBps(value: string, bps: number): string {
  const amount = normalizeBigInt(value)
  return ((amount * BigInt(bps)) / 10_000n).toString()
}

function clampMultiplier(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return 11_000
  return Math.max(10_000, Math.trunc(value))
}


import { ChainRegistry } from '@mde/chains'
import type { ExecutionPayload, ExecutionSimulation } from '@mde/domain'
import {
  decodeCalldataEnvelope,
  FetchJsonRpcTransport,
  isHexAddress,
  resolveRpcUrl,
  type JsonRpcTransport,
} from '@mde/protocols'

export type ExecutionSimulationOptions = {
  chainRegistry?: ChainRegistry
  transport?: JsonRpcTransport
  rpcUrl?: string
  from?: string
  blockTag?: string
}

export function resolveSimulationFromAddress(chainKey: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const suffix = chainKey.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  const chainSpecific = env[`${suffix}_SIMULATION_FROM`]
  if (isHexAddress(chainSpecific)) return chainSpecific
  return isHexAddress(env.ENGINE_OPERATOR_ADDRESS) ? env.ENGINE_OPERATOR_ADDRESS : undefined
}

export async function simulateExecutionPayload(
  payload: ExecutionPayload,
  options: ExecutionSimulationOptions = {}
): Promise<ExecutionSimulation> {
  const envelope = decodeCalldataEnvelope(payload.data)
  const blockTag = options.blockTag ?? 'latest'

  if (!isHexAddress(payload.to)) {
    return {
      ok: false,
      chainKey: payload.chainKey,
      from: undefined,
      to: payload.to,
      value: payload.value,
      blockTag,
      method: payload.method ?? envelope?.method,
      selector: envelope?.selector,
      errorReason: `invalid_target_address:${payload.to}`,
      warnings: [],
    }
  }

  const from = isHexAddress(payload.from)
    ? payload.from
    : isHexAddress(options.from)
      ? options.from
      : resolveSimulationFromAddress(payload.chainKey)

  if (!from) {
    return {
      ok: false,
      chainKey: payload.chainKey,
      from: undefined,
      to: payload.to,
      value: payload.value,
      blockTag,
      method: payload.method ?? envelope?.method,
      selector: envelope?.selector,
      errorReason: 'simulation_from_address_unavailable',
      warnings: ['Set ENGINE_OPERATOR_ADDRESS or <CHAIN>_SIMULATION_FROM to enable RPC preflight'],
    }
  }

  const chainRegistry = options.chainRegistry ?? new ChainRegistry()
  const chain = chainRegistry.get(payload.chainKey)
  const rpcUrl = options.rpcUrl ?? resolveRpcUrl(payload.chainKey, chain?.rpcUrls ?? [])
  const transport = options.transport ?? (rpcUrl ? new FetchJsonRpcTransport(rpcUrl) : undefined)

  if (!transport) {
    return {
      ok: false,
      chainKey: payload.chainKey,
      from,
      to: payload.to,
      value: payload.value,
      blockTag,
      method: payload.method ?? envelope?.method,
      selector: envelope?.selector,
      rpcUrl,
      errorReason: 'rpc_unavailable',
      warnings: ['No RPC URL resolved for chain; set <CHAIN>_RPC_URL to enable preflight'],
    }
  }

  const tx = {
    from,
    to: payload.to,
    data: payload.data,
    value: decimalToHexQuantity(payload.value),
  }

  try {
    const estimateResult = await transport.request('eth_estimateGas', [tx])
    if (typeof estimateResult !== 'string') {
      throw new Error('RPC eth_estimateGas did not return a hex string')
    }

    const callResult = await transport.request('eth_call', [tx, blockTag])
    if (typeof callResult !== 'string') {
      throw new Error('RPC eth_call did not return a hex string')
    }

    return {
      ok: true,
      chainKey: payload.chainKey,
      from,
      to: payload.to,
      value: payload.value,
      blockTag,
      method: payload.method ?? envelope?.method,
      selector: envelope?.selector,
      gasEstimate: hexQuantityToDecimal(estimateResult),
      callResult,
      rpcUrl,
      warnings: [],
    }
  } catch (error) {
    return {
      ok: false,
      chainKey: payload.chainKey,
      from,
      to: payload.to,
      value: payload.value,
      blockTag,
      method: payload.method ?? envelope?.method,
      selector: envelope?.selector,
      rpcUrl,
      errorReason: error instanceof Error ? error.message : String(error),
      warnings: [],
    }
  }
}

function decimalToHexQuantity(value: string): string {
  try {
    return `0x${BigInt(value).toString(16)}`
  } catch {
    return value
  }
}

function hexQuantityToDecimal(value: string): string {
  try {
    return BigInt(value).toString()
  } catch {
    return value
  }
}

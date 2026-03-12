import type { AaveReserveState } from '@mde/domain'
import { ProtocolRegistry } from '../registry.js'
import { resolveAssetReference } from './assets.js'
import {
  buildCallData,
  createFetchTransport,
  decodeUint256,
  encodeAddress,
  ethCall,
  type JsonRpcTransport,
} from './json-rpc.js'
import { resolveAaveV3Contracts } from './official-addresses.js'

const GET_RESERVE_DATA_SELECTOR = '0x35ea6a75'

export type DiscoverAaveV3ReserveParams = {
  chainKey: string
  asset: string
  addressBook?: Record<string, string>
  transport?: JsonRpcTransport
  registry?: ProtocolRegistry
}

function readFlag(value: bigint, bit: number): boolean {
  return ((value >> BigInt(bit)) & 1n) === 1n
}

function readBits(value: bigint, start: number, length: number): bigint {
  const mask = (1n << BigInt(length)) - 1n
  return (value >> BigInt(start)) & mask
}

export function isAaveReserveFlashEligible(reserve: AaveReserveState | undefined): boolean {
  if (!reserve) return false
  return reserve.isActive && !reserve.isFrozen && reserve.borrowingEnabled && !reserve.paused && reserve.flashLoanEnabled
}

export async function discoverAaveV3Reserve(params: DiscoverAaveV3ReserveParams): Promise<AaveReserveState | undefined> {
  const registry = params.registry ?? new ProtocolRegistry()
  const contracts = resolveAaveV3Contracts(params.chainKey, registry)
  const transport = params.transport ?? createFetchTransport(params.chainKey)
  const asset = resolveAssetReference(params.chainKey, params.asset, params.addressBook)

  if (!contracts.pool || !transport || !asset.address) {
    return undefined
  }

  const data = buildCallData(GET_RESERVE_DATA_SELECTOR, [encodeAddress(asset.address)])
  const raw = await ethCall(transport, contracts.pool, data)
  if (!raw || raw === '0x') return undefined

  const configBitsBigInt = decodeUint256(raw, 0)
  const decimals = Number(readBits(configBitsBigInt, 48, 8))
  const state: AaveReserveState = {
    chainKey: params.chainKey,
    poolAddress: contracts.pool,
    asset: asset.address,
    symbol: asset.symbol,
    decimals,
    isActive: readFlag(configBitsBigInt, 56),
    isFrozen: readFlag(configBitsBigInt, 57),
    borrowingEnabled: readFlag(configBitsBigInt, 58),
    paused: readFlag(configBitsBigInt, 60),
    flashLoanEnabled: readFlag(configBitsBigInt, 63),
    borrowCap: readBits(configBitsBigInt, 80, 36).toString(),
    supplyCap: readBits(configBitsBigInt, 116, 36).toString(),
    configBits: `0x${configBitsBigInt.toString(16)}`,
    discoveredAtMs: Date.now(),
    discoveryMode: 'live_rpc',
    warnings: [],
  }

  if (!state.isActive) state.warnings.push('Reserve is not active')
  if (state.isFrozen) state.warnings.push('Reserve is frozen')
  if (!state.borrowingEnabled) state.warnings.push('Borrowing is disabled on this reserve')
  if (state.paused) state.warnings.push('Reserve is paused')
  if (!state.flashLoanEnabled) state.warnings.push('Flash loaning is disabled on this reserve')

  return state
}

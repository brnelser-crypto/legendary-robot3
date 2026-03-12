import type { ResolvedAssetReference, TradeIntent } from '@mde/domain'
import { normalizeAsset } from '../utils.js'
import { isHexAddress } from './json-rpc.js'

type BuiltinAsset = {
  address: string
  symbol: string
  decimals: number
}

const BUILTIN_ASSETS: Record<string, Record<string, BuiltinAsset>> = {
  ethereum: {
    USDC: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      decimals: 6,
    },
    WETH: {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      decimals: 18,
    },
  },
  arbitrum: {
    USDC: {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      decimals: 6,
    },
    WETH: {
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      symbol: 'WETH',
      decimals: 18,
    },
  },
  base: {
    USDC: {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      decimals: 6,
    },
    WETH: {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      decimals: 18,
    },
  },
}

export function getBuiltinAssetAddressBook(chainKey: string): Record<string, string> {
  const assets = BUILTIN_ASSETS[chainKey] ?? {}
  return Object.fromEntries(Object.entries(assets).map(([symbol, asset]) => [symbol, asset.address]))
}

function coerceAddressBook(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}

  const out: Record<string, string> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'string' && isHexAddress(item)) {
      out[normalizeAsset(key)] = item
    }
  }
  return out
}

export function resolveIntentAssetAddressBook(intent: TradeIntent): Record<string, string> {
  const metadata = intent.metadata ?? {}
  return {
    ...coerceAddressBook(metadata.assetAddresses),
    ...coerceAddressBook(metadata.assetMap),
    ...coerceAddressBook(metadata.addresses),
  }
}

export function resolveAssetReference(
  chainKey: string,
  value: string,
  addressBook: Record<string, string> = {}
): ResolvedAssetReference {
  if (isHexAddress(value)) {
    return {
      chainKey,
      input: value,
      symbol: value,
      address: value,
      source: 'input',
    }
  }

  const normalized = normalizeAsset(value)
  const fromMetadata = addressBook[normalized]
  if (fromMetadata && isHexAddress(fromMetadata)) {
    const builtin = BUILTIN_ASSETS[chainKey]?.[normalized]
    return {
      chainKey,
      input: value,
      symbol: normalized,
      address: fromMetadata,
      decimals: builtin?.decimals,
      source: 'metadata',
    }
  }

  const builtin = BUILTIN_ASSETS[chainKey]?.[normalized]
  if (builtin) {
    return {
      chainKey,
      input: value,
      symbol: builtin.symbol,
      address: builtin.address,
      decimals: builtin.decimals,
      source: 'builtin',
    }
  }

  return {
    chainKey,
    input: value,
    symbol: normalized,
    source: 'unresolved',
  }
}

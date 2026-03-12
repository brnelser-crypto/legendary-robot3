import { ProtocolRegistry } from '../registry.js'
import { chainKeyToEnvSuffix, resolveEnvTemplate } from './json-rpc.js'

export type ResolvedUniswapContracts = {
  factory?: string
  router?: string
  quoterV2?: string
}

export type ResolvedAaveContracts = {
  pool?: string
}

const UNISWAP_V3_OFFICIAL_DEPLOYMENTS: Record<string, ResolvedUniswapContracts> = {
  ethereum: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  },
  arbitrum: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  },
  base: {
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  },
}

function firstUsable(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const resolved = resolveEnvTemplate(value)
    if (!resolved) continue
    if (resolved.includes('DISCOVER') || resolved.includes('{{')) continue
    return resolved
  }
  return undefined
}

export function resolveUniswapV3Contracts(
  chainKey: string,
  registry: ProtocolRegistry = new ProtocolRegistry()
): ResolvedUniswapContracts {
  const deployment = registry.getByProtocolAndChain('uniswap_v3', chainKey)[0]
  const envSuffix = chainKeyToEnvSuffix(chainKey)
  const official = UNISWAP_V3_OFFICIAL_DEPLOYMENTS[chainKey] ?? {}

  return {
    factory: firstUsable(
      process.env[`UNISWAP_V3_FACTORY_${envSuffix}`],
      deployment?.contracts.factory,
      official.factory
    ),
    router: firstUsable(
      process.env[`UNISWAP_V3_ROUTER_${envSuffix}`],
      deployment?.contracts.swapRouter02,
      deployment?.contracts.router,
      official.router
    ),
    quoterV2: firstUsable(
      process.env[`UNISWAP_V3_QUOTER_V2_${envSuffix}`],
      deployment?.contracts.quoterV2,
      official.quoterV2
    ),
  }
}

export function resolveAaveV3Contracts(
  chainKey: string,
  registry: ProtocolRegistry = new ProtocolRegistry()
): ResolvedAaveContracts {
  const deployment = registry.getByProtocolAndChain('aave_v3', chainKey)[0]
  const envSuffix = chainKeyToEnvSuffix(chainKey)

  return {
    pool: firstUsable(process.env[`AAVE_V3_POOL_${envSuffix}`], deployment?.contracts.pool),
  }
}

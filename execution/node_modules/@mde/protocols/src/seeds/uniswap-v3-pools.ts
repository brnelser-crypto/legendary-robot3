import { normalizeAsset, pairKey } from '../utils.js'

export type UniswapV3PoolSeed = {
  chainKey: string
  token0: string
  token1: string
  feeTier: number
  poolAddress: string
  routerAddress?: string
  estimatedGas: string
  liquidityScore: number
  priceImpactBps: number
  zeroForOneEdgeBps: number
  oneForZeroEdgeBps: number
  flashSupported: boolean
}

export const UNISWAP_V3_POOL_SEED: UniswapV3PoolSeed[] = [
  {
    chainKey: 'ethereum',
    token0: 'USDC',
    token1: 'WETH',
    feeTier: 500,
    poolAddress: 'SEED_ETH_USDC_WETH_500',
    routerAddress: '{{UNISWAP_V3_ROUTER}}',
    estimatedGas: '185000',
    liquidityScore: 0.96,
    priceImpactBps: 4,
    zeroForOneEdgeBps: 28,
    oneForZeroEdgeBps: 12,
    flashSupported: true,
  },
  {
    chainKey: 'ethereum',
    token0: 'USDC',
    token1: 'WETH',
    feeTier: 3000,
    poolAddress: 'SEED_ETH_USDC_WETH_3000',
    routerAddress: '{{UNISWAP_V3_ROUTER}}',
    estimatedGas: '195000',
    liquidityScore: 0.93,
    priceImpactBps: 6,
    zeroForOneEdgeBps: 10,
    oneForZeroEdgeBps: 38,
    flashSupported: true,
  },
  {
    chainKey: 'ethereum',
    token0: 'DAI',
    token1: 'USDC',
    feeTier: 100,
    poolAddress: 'SEED_ETH_DAI_USDC_100',
    routerAddress: '{{UNISWAP_V3_ROUTER}}',
    estimatedGas: '165000',
    liquidityScore: 0.98,
    priceImpactBps: 1,
    zeroForOneEdgeBps: 2,
    oneForZeroEdgeBps: 2,
    flashSupported: true,
  },
  {
    chainKey: 'arbitrum',
    token0: 'USDC',
    token1: 'WETH',
    feeTier: 500,
    poolAddress: 'SEED_ARB_USDC_WETH_500',
    routerAddress: '{{UNISWAP_V3_ROUTER}}',
    estimatedGas: '170000',
    liquidityScore: 0.95,
    priceImpactBps: 4,
    zeroForOneEdgeBps: 26,
    oneForZeroEdgeBps: 11,
    flashSupported: true,
  },
  {
    chainKey: 'arbitrum',
    token0: 'USDC',
    token1: 'WETH',
    feeTier: 3000,
    poolAddress: 'SEED_ARB_USDC_WETH_3000',
    routerAddress: '{{UNISWAP_V3_ROUTER}}',
    estimatedGas: '182000',
    liquidityScore: 0.91,
    priceImpactBps: 6,
    zeroForOneEdgeBps: 8,
    oneForZeroEdgeBps: 40,
    flashSupported: true,
  },
  {
    chainKey: 'arbitrum',
    token0: 'DAI',
    token1: 'USDC',
    feeTier: 100,
    poolAddress: 'SEED_ARB_DAI_USDC_100',
    routerAddress: '{{UNISWAP_V3_ROUTER}}',
    estimatedGas: '160000',
    liquidityScore: 0.97,
    priceImpactBps: 1,
    zeroForOneEdgeBps: 2,
    oneForZeroEdgeBps: 2,
    flashSupported: true,
  },
  {
    chainKey: 'base',
    token0: 'USDC',
    token1: 'WETH',
    feeTier: 500,
    poolAddress: 'SEED_BASE_USDC_WETH_500',
    routerAddress: '{{UNISWAP_V3_ROUTER}}',
    estimatedGas: '172000',
    liquidityScore: 0.94,
    priceImpactBps: 5,
    zeroForOneEdgeBps: 24,
    oneForZeroEdgeBps: 9,
    flashSupported: true,
  },
  {
    chainKey: 'base',
    token0: 'USDC',
    token1: 'WETH',
    feeTier: 3000,
    poolAddress: 'SEED_BASE_USDC_WETH_3000',
    routerAddress: '{{UNISWAP_V3_ROUTER}}',
    estimatedGas: '184000',
    liquidityScore: 0.9,
    priceImpactBps: 7,
    zeroForOneEdgeBps: 9,
    oneForZeroEdgeBps: 38,
    flashSupported: true,
  },
]

export function findDirectPools(chainKey: string, tokenIn: string, tokenOut: string): UniswapV3PoolSeed[] {
  const requestedPair = pairKey(tokenIn, tokenOut)
  return UNISWAP_V3_POOL_SEED
    .filter((pool) => pool.chainKey === chainKey && pairKey(pool.token0, pool.token1) === requestedPair)
    .sort((a, b) => {
      if (b.liquidityScore !== a.liquidityScore) return b.liquidityScore - a.liquidityScore
      return a.feeTier - b.feeTier
    })
}

export function directionForPool(pool: UniswapV3PoolSeed, tokenIn: string): 'zeroForOne' | 'oneForZero' {
  return normalizeAsset(tokenIn) === normalizeAsset(pool.token0) ? 'zeroForOne' : 'oneForZero'
}

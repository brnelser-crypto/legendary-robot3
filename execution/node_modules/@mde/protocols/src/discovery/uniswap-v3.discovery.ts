import type { RouteInput, RouteQuote, UniswapV3PoolSnapshot } from '@mde/domain'
import { ProtocolRegistry } from '../registry.js'
import { safeBigInt } from '../utils.js'
import { resolveAssetReference } from './assets.js'
import {
  buildCallData,
  createFetchTransport,
  decodeAddress,
  decodeInt256,
  decodeUint256,
  encodeAddress,
  encodeUint,
  ethCall,
  normalizeAddress,
  type JsonRpcTransport,
} from './json-rpc.js'
import { resolveUniswapV3Contracts } from './official-addresses.js'

const GET_POOL_SELECTOR = '0x1698ee82'
const SLOT0_SELECTOR = '0x3850c7bd'
const LIQUIDITY_SELECTOR = '0x1a686502'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const Q192 = 2n ** 192n
const FEE_DENOMINATOR = 1_000_000n

export type DiscoverUniswapV3PoolsParams = {
  chainKey: string
  tokenIn: string
  tokenOut: string
  amountIn: string
  addressBook?: Record<string, string>
  transport?: JsonRpcTransport
  registry?: ProtocolRegistry
}

function candidateFeeTiers(chainKey: string, registry: ProtocolRegistry): number[] {
  const deployment = registry.getByProtocolAndChain('uniswap_v3', chainKey)[0]
  const raw = deployment?.feeModel.tiers ?? [5, 30, 100]
  const normalized = raw.map((value) => (value < 1000 ? value * 100 : value))
  return [...new Set([100, 500, 3000, 10000, ...normalized])].sort((a, b) => a - b)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function scoreLiquidity(liquidity: bigint): number {
  const digits = liquidity.toString().length
  return clamp(0.55 + Math.max(0, digits - 6) * 0.035, 0.55, 0.99)
}

function estimateSlippageBps(liquidity: bigint, amountIn: string): number {
  const liqDigits = liquidity.toString().length
  const amountDigits = safeBigInt(amountIn).toString().length
  const imbalance = Math.max(0, amountDigits - Math.max(1, liqDigits - 8))
  return Math.max(1, Math.min(60, 2 + imbalance * 5))
}

function estimateGasForFeeTier(feeTier: number): string {
  if (feeTier <= 500) return '170000'
  if (feeTier <= 3000) return '185000'
  return '200000'
}

function estimateAmountOut(amountIn: string, sqrtPriceX96: bigint, feeTier: number, zeroForOne: boolean): string {
  const amountAfterFee = (safeBigInt(amountIn) * (FEE_DENOMINATOR - BigInt(feeTier))) / FEE_DENOMINATOR
  if (amountAfterFee <= 0n || sqrtPriceX96 <= 0n) return '0'

  const priceX192 = sqrtPriceX96 * sqrtPriceX96
  if (priceX192 <= 0n) return '0'

  const amountOut = zeroForOne
    ? (amountAfterFee * priceX192) / Q192
    : (amountAfterFee * Q192) / priceX192

  return amountOut > 0n ? amountOut.toString() : '0'
}

export async function discoverUniswapV3Pools(params: DiscoverUniswapV3PoolsParams): Promise<UniswapV3PoolSnapshot[]> {
  const registry = params.registry ?? new ProtocolRegistry()
  const contracts = resolveUniswapV3Contracts(params.chainKey, registry)
  const transport = params.transport ?? createFetchTransport(params.chainKey)
  const tokenIn = resolveAssetReference(params.chainKey, params.tokenIn, params.addressBook)
  const tokenOut = resolveAssetReference(params.chainKey, params.tokenOut, params.addressBook)

  if (!contracts.factory || !transport || !tokenIn.address || !tokenOut.address) {
    return []
  }

  const zeroForOne = normalizeAddress(tokenIn.address) < normalizeAddress(tokenOut.address)
  const snapshots: UniswapV3PoolSnapshot[] = []

  for (const feeTier of candidateFeeTiers(params.chainKey, registry)) {
    try {
      const poolData = buildCallData(GET_POOL_SELECTOR, [
        encodeAddress(tokenIn.address),
        encodeAddress(tokenOut.address),
        encodeUint(feeTier),
      ])
      const poolAddress = decodeAddress(await ethCall(transport, contracts.factory, poolData))
      if (normalizeAddress(poolAddress) === normalizeAddress(ZERO_ADDRESS)) continue

      const [liquidityRaw, slot0Raw] = await Promise.all([
        ethCall(transport, poolAddress, buildCallData(LIQUIDITY_SELECTOR)),
        ethCall(transport, poolAddress, buildCallData(SLOT0_SELECTOR)),
      ])

      const liquidity = decodeUint256(liquidityRaw, 0)
      const sqrtPriceX96 = decodeUint256(slot0Raw, 0)
      const tick = Number(decodeInt256(slot0Raw, 1))
      if (liquidity === 0n || sqrtPriceX96 === 0n) continue

      const score = scoreLiquidity(liquidity)
      const estimatedAmountOut = estimateAmountOut(params.amountIn, sqrtPriceX96, feeTier, zeroForOne)

      snapshots.push({
        chainKey: params.chainKey,
        factoryAddress: contracts.factory,
        routerAddress: contracts.router,
        poolAddress,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        feeTier,
        swapFeeBps: Math.round(feeTier / 100),
        sqrtPriceX96: sqrtPriceX96.toString(),
        liquidity: liquidity.toString(),
        tick,
        estimatedAmountOut,
        liquidityScore: score,
        confidence: clamp(0.8 + score * 0.18, 0.8, 0.98),
        discoveredAtMs: Date.now(),
        quoteModel: 'live_uniswap_v3_slot0_heuristic',
        warnings: contracts.router ? [] : ['Router address is not resolved for this chain'],
      })
    } catch {
      continue
    }
  }

  return snapshots.sort((left, right) => {
    if (right.liquidityScore !== left.liquidityScore) {
      return right.liquidityScore - left.liquidityScore
    }
    return left.feeTier - right.feeTier
  })
}

export async function quoteUniswapV3Live(
  routeInput: RouteInput,
  options: Omit<DiscoverUniswapV3PoolsParams, 'chainKey' | 'tokenIn' | 'tokenOut' | 'amountIn'> = {}
): Promise<RouteQuote[]> {
  const tokenIn = routeInput.intent.inputAssets[0]
  const tokenOut = routeInput.intent.outputAssets[0]
  if (!tokenIn || !tokenOut || tokenIn === tokenOut) return []

  const amountIn = routeInput.intent.amountIn ?? '0'
  const pools = await discoverUniswapV3Pools({
    chainKey: routeInput.intent.sourceChain,
    tokenIn,
    tokenOut,
    amountIn,
    addressBook: options.addressBook,
    transport: options.transport,
    registry: options.registry,
  })

  return pools.map((pool) => ({
    routeId: `${routeInput.intent.intentId}:uniswap_v3:${routeInput.intent.sourceChain}:${pool.poolAddress}:${pool.feeTier}`,
    protocolKey: 'uniswap_v3',
    chainKey: routeInput.intent.sourceChain,
    estimatedAmountOut: pool.estimatedAmountOut,
    estimatedGas: estimateGasForFeeTier(pool.feeTier),
    swapFeeBps: pool.swapFeeBps,
    slippageBps: estimateSlippageBps(BigInt(pool.liquidity), amountIn),
    liquidityScore: pool.liquidityScore,
    confidence: pool.confidence,
    metadata: {
      poolAddress: pool.poolAddress,
      routerAddress: pool.routerAddress,
      tokenIn: pool.tokenIn,
      tokenOut: pool.tokenOut,
      feeTier: pool.feeTier,
      direction: normalizeAddress(pool.tokenIn) < normalizeAddress(pool.tokenOut) ? 'zeroForOne' : 'oneForZero',
      sqrtPriceX96: pool.sqrtPriceX96,
      liveLiquidity: pool.liquidity,
      tick: pool.tick,
      factoryAddress: pool.factoryAddress,
      discoveryMode: 'live_rpc',
      stateTimestampMs: pool.discoveredAtMs,
      flashCallbackSupported: true,
      quoteModel: pool.quoteModel,
      warnings: pool.warnings,
    },
  }))
}

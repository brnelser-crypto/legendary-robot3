export type LiquidityEvent = {
  poolAddress: string
  blockNumber: number
  timestamp: number
  type: 'mint' | 'burn' | 'collect' | 'swap'
  tickLower?: number
  tickUpper?: number
  liquidityDelta?: string
  currentTick?: number
}

export type LiquidityHeatmapCell = {
  tickLower: number
  tickUpper: number
  netLiquidity: number
  observations: number
}

export type PositionSnapshot = {
  owner: string
  tickLower: number
  tickUpper: number
  liquidity: string
  currentTick: number
  realizedPnlUsd: number
  unrealizedPnlUsd: number
  accruedFeesUsd: number
}

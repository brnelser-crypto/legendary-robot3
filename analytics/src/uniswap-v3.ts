import type { LiquidityEvent, LiquidityHeatmapCell, PositionSnapshot } from './types.js'

export function buildLiquidityHeatmap(events: LiquidityEvent[]): LiquidityHeatmapCell[] {
  const buckets = new Map<string, LiquidityHeatmapCell>()

  for (const event of events) {
    if (event.tickLower === undefined || event.tickUpper === undefined) continue
    const key = `${event.tickLower}:${event.tickUpper}`
    const existing = buckets.get(key) ?? {
      tickLower: event.tickLower,
      tickUpper: event.tickUpper,
      netLiquidity: 0,
      observations: 0,
    }

    existing.netLiquidity += Number(event.liquidityDelta ?? '0')
    existing.observations += 1
    buckets.set(key, existing)
  }

  return [...buckets.values()].sort((a, b) => a.tickLower - b.tickLower)
}

export function summarizePosition(position: PositionSnapshot): PositionSnapshot & { inRange: boolean } {
  return {
    ...position,
    inRange: position.currentTick >= position.tickLower && position.currentTick < position.tickUpper,
  }
}

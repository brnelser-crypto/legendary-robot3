export function safeBigInt(value: string | number | bigint | undefined, fallback = 0n): bigint {
  try {
    if (value === undefined || value === null || value === '') return fallback
    if (typeof value === 'bigint') return value
    if (typeof value === 'number') return BigInt(Math.trunc(value))
    return BigInt(value)
  } catch {
    return fallback
  }
}

export function applyBpsDelta(amount: string, deltaBps: number): string {
  const base = safeBigInt(amount)
  const scalar = 10_000 + deltaBps
  if (scalar <= 0) return '0'
  return ((base * BigInt(scalar)) / 10_000n).toString()
}

export function addBps(amount: string, bps: number): string {
  return applyBpsDelta(amount, Math.max(0, bps))
}

export function subtractAmounts(left: string, right: string): string {
  return (safeBigInt(left) - safeBigInt(right)).toString()
}

export function compareAmounts(left: string, right: string): number {
  const a = safeBigInt(left)
  const b = safeBigInt(right)
  if (a === b) return 0
  return a > b ? 1 : -1
}

export function normalizeAsset(asset: string): string {
  const trimmed = asset.trim()
  return trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed.toLowerCase() : trimmed.toUpperCase()
}

export function pairKey(tokenA: string, tokenB: string): string {
  const [left, right] = [normalizeAsset(tokenA), normalizeAsset(tokenB)].sort()
  return `${left}::${right}`
}

export function encodeJsonHex(payload: unknown): string {
  return `0x${Buffer.from(JSON.stringify(payload), 'utf8').toString('hex')}`
}

export function decodeJsonHex<T>(payload: string): T | undefined {
  try {
    const raw = payload.startsWith('0x') ? payload.slice(2) : payload
    const decoded = Buffer.from(raw, 'hex').toString('utf8')
    return JSON.parse(decoded) as T
  } catch {
    return undefined
  }
}

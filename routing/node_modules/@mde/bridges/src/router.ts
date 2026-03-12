import type { BridgeQuote } from '@mde/domain'

export type BridgeRequest = {
  sourceChain: string
  destinationChain: string
  sourceAsset: string
  destinationAsset: string
  amountIn: string
  allowedProviders?: string[]
}

type BridgeProviderProfile = {
  feeBps: number
  estimatedTimeSec: number
  requiresManualRedeem: boolean
  warnings: string[]
}

const DEFAULT_BRIDGE_PROVIDERS = ['across', 'stargate', 'layerzero', 'wormhole', 'cbridge', 'debridge', 'meson']

const BRIDGE_PROVIDER_PROFILES: Record<string, BridgeProviderProfile> = {
  across: {
    feeBps: 4,
    estimatedTimeSec: 90,
    requiresManualRedeem: false,
    warnings: [],
  },
  stargate: {
    feeBps: 7,
    estimatedTimeSec: 180,
    requiresManualRedeem: false,
    warnings: [],
  },
  layerzero: {
    feeBps: 9,
    estimatedTimeSec: 240,
    requiresManualRedeem: false,
    warnings: ['Destination execution depends on LayerZero endpoint wiring for final settlement'],
  },
  wormhole: {
    feeBps: 12,
    estimatedTimeSec: 300,
    requiresManualRedeem: true,
    warnings: ['Manual redeem may be required depending on route settlement'],
  },
  cbridge: {
    feeBps: 8,
    estimatedTimeSec: 210,
    requiresManualRedeem: false,
    warnings: [],
  },
  debridge: {
    feeBps: 6,
    estimatedTimeSec: 150,
    requiresManualRedeem: false,
    warnings: [],
  },
  meson: {
    feeBps: 5,
    estimatedTimeSec: 200,
    requiresManualRedeem: false,
    warnings: [],
  },
}

export class BridgeRouter {
  async quote(request: BridgeRequest): Promise<BridgeQuote[]> {
    const providers = request.allowedProviders?.length ? request.allowedProviders : DEFAULT_BRIDGE_PROVIDERS

    return providers
      .map((provider) => this.buildQuote(provider, request))
      .sort((a, b) => this.rankQuote(b) - this.rankQuote(a))
  }

  validate(quote: BridgeQuote, maxTimeSec: number): { valid: boolean; reasons: string[] } {
    const reasons: string[] = []

    if (quote.estimatedTimeSec > maxTimeSec) {
      reasons.push('Bridge settlement exceeds strategy threshold')
    }

    if (quote.requiresManualRedeem) {
      reasons.push('Manual redeem route requires explicit policy approval')
    }

    return { valid: reasons.length === 0, reasons }
  }

  private buildQuote(provider: string, request: BridgeRequest): BridgeQuote {
    const profile = BRIDGE_PROVIDER_PROFILES[provider] ?? {
      feeBps: 12,
      estimatedTimeSec: 360,
      requiresManualRedeem: false,
      warnings: ['Bridge provider is using fallback heuristic metadata'],
    }

    return {
      provider,
      sourceChain: request.sourceChain,
      destinationChain: request.destinationChain,
      sourceAsset: request.sourceAsset,
      destinationAsset: request.destinationAsset,
      amountIn: request.amountIn,
      estimatedAmountOut: applyNegativeBps(request.amountIn, profile.feeBps),
      estimatedTimeSec: profile.estimatedTimeSec,
      requiresManualRedeem: profile.requiresManualRedeem,
      gasTokenRequired: gasTokenForChain(request.sourceChain),
      warnings: [...profile.warnings],
    }
  }

  private rankQuote(quote: BridgeQuote): number {
    let score = 10_000

    score -= quote.estimatedTimeSec
    score -= quote.requiresManualRedeem ? 250 : 0
    score -= quote.warnings.length * 20
    score -= estimateFeeBps(quote.amountIn, quote.estimatedAmountOut) * 10

    return score
  }
}

function gasTokenForChain(chainKey: string): string {
  switch (chainKey) {
    case 'solana':
      return 'SOL'
    case 'aptos':
      return 'APT'
    default:
      return 'ETH'
  }
}

function applyNegativeBps(amount: string, feeBps: number): string {
  const value = safeBigInt(amount)
  if (value === 0n) return '0'
  const multiplier = BigInt(Math.max(0, 10_000 - feeBps))
  return ((value * multiplier) / 10_000n).toString()
}

function estimateFeeBps(amountIn: string, amountOut: string): number {
  const input = safeBigInt(amountIn)
  const output = safeBigInt(amountOut)
  if (input === 0n || output >= input) return 0
  return Number(((input - output) * 10_000n) / input)
}

function safeBigInt(value: string): bigint {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

export type RouteScoreInput = {
  expectedPnlUsd: number
  flashFeeUsd: number
  swapFeeUsd: number
  bridgeFeeUsd: number
  gasUsd: number
  slippageRisk: number
  liquidityDepth: number
  repaymentCertainty: number
  bridgeCompletionConfidence: number
}

export type RouteScoreComponentKey = keyof RouteScoreInput

export type RouteScoreComponent = {
  value: number
  weight: number
  contribution: number
}

export type RouteScoreBreakdown = {
  total: number
  components: Record<RouteScoreComponentKey, RouteScoreComponent>
  positiveFactors: string[]
  negativeFactors: string[]
  penaltiesApplied: string[]
}

export const DEFAULT_ROUTE_SCORE_WEIGHTS = {
  expectedPnlUsd: 1.0,
  flashFeeUsd: -1.0,
  swapFeeUsd: -1.0,
  bridgeFeeUsd: -1.0,
  gasUsd: -1.0,
  slippageRisk: -50,
  liquidityDepth: 25,
  repaymentCertainty: 40,
  bridgeCompletionConfidence: 20,
} as const

export function scoreRouteDetailed(input: RouteScoreInput): RouteScoreBreakdown {
  const w = DEFAULT_ROUTE_SCORE_WEIGHTS
  const normalized: RouteScoreInput = {
    expectedPnlUsd: safeNumber(input.expectedPnlUsd),
    flashFeeUsd: safeNumber(input.flashFeeUsd),
    swapFeeUsd: safeNumber(input.swapFeeUsd),
    bridgeFeeUsd: safeNumber(input.bridgeFeeUsd),
    gasUsd: safeNumber(input.gasUsd),
    slippageRisk: safeNumber(input.slippageRisk),
    liquidityDepth: safeNumber(input.liquidityDepth),
    repaymentCertainty: safeNumber(input.repaymentCertainty),
    bridgeCompletionConfidence: safeNumber(input.bridgeCompletionConfidence),
  }

  const components: Record<RouteScoreComponentKey, RouteScoreComponent> = {
    expectedPnlUsd: component(normalized.expectedPnlUsd, w.expectedPnlUsd),
    flashFeeUsd: component(normalized.flashFeeUsd, w.flashFeeUsd),
    swapFeeUsd: component(normalized.swapFeeUsd, w.swapFeeUsd),
    bridgeFeeUsd: component(normalized.bridgeFeeUsd, w.bridgeFeeUsd),
    gasUsd: component(normalized.gasUsd, w.gasUsd),
    slippageRisk: component(normalized.slippageRisk, w.slippageRisk),
    liquidityDepth: component(normalized.liquidityDepth, w.liquidityDepth),
    repaymentCertainty: component(normalized.repaymentCertainty, w.repaymentCertainty),
    bridgeCompletionConfidence: component(normalized.bridgeCompletionConfidence, w.bridgeCompletionConfidence),
  }

  const total = Object.values(components).reduce((sum, item) => sum + item.contribution, 0)

  const positiveFactors = [
    ...(normalized.expectedPnlUsd > 0
      ? [`Expected pnl contributes ${components.expectedPnlUsd.contribution.toFixed(4)} to route score`]
      : []),
    ...(normalized.liquidityDepth >= 0.75
      ? [`Liquidity depth ${normalized.liquidityDepth.toFixed(2)} supports execution quality`]
      : []),
    ...(normalized.repaymentCertainty >= 0.95
      ? [`Repayment certainty ${normalized.repaymentCertainty.toFixed(2)} is strong`]
      : []),
    ...(normalized.bridgeCompletionConfidence >= 0.9
      ? [`Bridge completion confidence ${normalized.bridgeCompletionConfidence.toFixed(2)} is strong`]
      : []),
  ]

  const negativeFactors = [
    ...(normalized.flashFeeUsd > 0
      ? [`Flash fee subtracts ${Math.abs(components.flashFeeUsd.contribution).toFixed(4)} from route score`]
      : []),
    ...(normalized.swapFeeUsd > 0
      ? [`Swap fee subtracts ${Math.abs(components.swapFeeUsd.contribution).toFixed(4)} from route score`]
      : []),
    ...(normalized.bridgeFeeUsd > 0
      ? [`Bridge fee subtracts ${Math.abs(components.bridgeFeeUsd.contribution).toFixed(4)} from route score`]
      : []),
    ...(normalized.gasUsd > 0
      ? [`Gas envelope subtracts ${Math.abs(components.gasUsd.contribution).toFixed(4)} from route score`]
      : []),
    ...(normalized.slippageRisk > 0
      ? [`Slippage risk subtracts ${Math.abs(components.slippageRisk.contribution).toFixed(4)} from route score`]
      : []),
  ]

  const penaltiesApplied = [
    ...(normalized.slippageRisk > 0.01 ? ['High slippage penalty regime is active'] : []),
    ...(normalized.gasUsd > 50 ? ['High gas penalty regime is active'] : []),
    ...(normalized.repaymentCertainty < 0.9 ? ['Low repayment certainty penalty is active'] : []),
    ...(normalized.bridgeCompletionConfidence < 0.75 ? ['Bridge confidence penalty is active'] : []),
  ]

  return {
    total,
    components,
    positiveFactors,
    negativeFactors,
    penaltiesApplied,
  }
}

export function scoreRoute(input: RouteScoreInput): number {
  return scoreRouteDetailed(input).total
}

function component(value: number, weight: number): RouteScoreComponent {
  return {
    value,
    weight,
    contribution: value * weight,
  }
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0
}

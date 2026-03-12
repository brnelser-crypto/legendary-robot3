
import type { ExecutionJob, PlannedRoute, TradeIntent } from '@mde/domain'

export function createExecutionJob(intent: TradeIntent, route: PlannedRoute): ExecutionJob {
  const borrowAmount = typeof route.metadata?.borrowAmount === 'string' ? route.metadata.borrowAmount : undefined
  const amountOwed = typeof route.metadata?.amountOwed === 'string' ? route.metadata.amountOwed : undefined
  const flashFee = borrowAmount && amountOwed ? (safeBigInt(amountOwed) - safeBigInt(borrowAmount)).toString() : undefined

  return {
    jobId: `job:${route.routeId}`,
    intentId: intent.intentId,
    routeId: route.routeId,
    status: 'planned',
    chainLocks: [route.sourceChain, ...(route.destinationChain ? [route.destinationChain] : [])],
    protocolLocks: route.protocolKeys,
    walletContext: `${route.sourceChain}:${route.executionModel ?? 'same_chain_atomic'}`,
    gasBudget: String(Math.round((route.estimatedGasUsd ?? 0) * 1_000_000)),
    flashPrincipal: borrowAmount,
    flashFee,
    executionChainKey: route.sourceChain,
    lastUpdatedMs: Date.now(),
  }
}

function safeBigInt(value: string): bigint {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

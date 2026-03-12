export type RouterType = 'flash-loan' | 'flash-swap' | 'dex' | 'bridge' | 'lending'

export type ExecutionModel = 'same_chain_atomic' | 'cross_chain_staged'

export type ChainConfig = {
  chainKey: string
  chainId?: number
  name: string
  rpcUrls: string[]
  nativeGasToken: string
  isEvm: boolean
  supportsBridges: boolean
  bridgeProviders: string[]
  protocolKeys: string[]
}

export type ProtocolDeployment = {
  protocolKey: string
  chainKey: string
  routerType: RouterType
  contracts: Record<string, string>
  feeModel: {
    type: 'fixed_bps' | 'tiered_pool' | 'zero_fee' | 'dynamic'
    value?: number
    tiers?: number[]
  }
  callbackType?: string
  supportedAssets?: string[]
  notes?: string[]
}

export type PoolMetadata = {
  protocolKey: string
  chainKey: string
  poolAddress: string
  token0: string
  token1?: string
  feeTier?: number
  liquidityDepth?: string
  isFlashEnabled?: boolean
  reserveBorrowEnabled?: boolean
}

export type TradeStrategyType =
  | 'same_exchange_arbitrage'
  | 'cross_exchange_arbitrage'
  | 'cross_chain_execution'
  | 'collateral_swap'
  | 'liquidation'
  | 'multi_hop_swap'

export type TradeIntent = {
  intentId: string
  strategyType: TradeStrategyType
  sourceChain: string
  destinationChain?: string
  inputAssets: string[]
  outputAssets: string[]
  amountIn?: string
  maxSlippageBps: number
  requireFlashLiquidity: boolean
  allowedProtocols: string[]
  allowedBridgeProviders?: string[]
  deadlineMs: number
  metadata?: Record<string, unknown>
}

export type ExecutionJobStatus =
  | 'planned'
  | 'validated'
  | 'prepared'
  | 'submitted'
  | 'pending'
  | 'confirmed'
  | 'bridging'
  | 'settled'
  | 'repaid'
  | 'failed'
  | 'cancelled'

export type ExecutionJob = {
  jobId: string
  intentId: string
  routeId: string
  status: ExecutionJobStatus
  chainLocks: string[]
  protocolLocks: string[]
  walletContext: string
  gasBudget: string
  flashPrincipal?: string
  flashFee?: string
  bridgeId?: string
  executionChainKey?: string
  submittedTxHash?: string
  submittedVia?: 'mock' | 'rpc_send' | 'rpc_sendTransaction' | 'rpc_sendRawTransaction' | 'external' | 'not_submitted'
  nonce?: number
  lastErrorReason?: string
  lastUpdatedMs?: number
  lastSubmittedMs?: number
  submitAttempts?: number
  replacementTxHashes?: string[]
  receiptBlockNumber?: number
  confirmations?: number
}

export type RouteStepType =
  | 'flash_borrow'
  | 'swap'
  | 'bridge'
  | 'repay'
  | 'settlement'
  | 'approval'

export type RouteStep = {
  stepId: string
  type: RouteStepType
  chainKey: string
  protocolKey: string
  action: string
  requiresAtomic: boolean
  params: Record<string, unknown>
}

export type RouteInput = {
  intent: TradeIntent
  sourceChainConfig?: ChainConfig
  candidateProtocols: ProtocolDeployment[]
}

export type RouteQuote = {
  routeId: string
  protocolKey: string
  chainKey: string
  estimatedAmountOut: string
  estimatedGas: string
  flashFeeBps?: number
  swapFeeBps?: number
  bridgeFeeBps?: number
  slippageBps?: number
  liquidityScore?: number
  confidence?: number
  metadata?: Record<string, unknown>
}

export type PlannedRoute = {
  routeId: string
  intentId: string
  sourceChain: string
  destinationChain?: string
  protocolKeys: string[]
  steps: RouteStep[]
  estimatedPnlUsd?: number
  estimatedGasUsd?: number
  estimatedBridgeTimeSec?: number
  score: number
  warnings: string[]
  executionModel?: ExecutionModel
  metadata?: Record<string, unknown>
}

export type ValidationIssue = {
  check: string
  severity: 'warning' | 'error'
  message: string
}

export type ValidationResult = {
  valid: boolean
  issues: ValidationIssue[]
}

export type ExecutionPayload = {
  chainKey: string
  to: string
  data: string
  value: string
  from?: string
  method?: string
  summary?: Record<string, unknown>
  notes?: string[]
}

export type ExecutionSimulation = {
  ok: boolean
  chainKey: string
  from?: string
  to: string
  value: string
  blockTag: string
  method?: string
  selector?: string
  gasEstimate?: string
  callResult?: string
  rpcUrl?: string
  errorReason?: string
  warnings: string[]
}

export type ExecutionPreflightDecision = {
  approved: boolean
  policy: {
    requirePreflight: boolean
    requireFromAddress: boolean
    blockTag: string
    maxEstimatedGas?: string
  }
  reasons: string[]
  warnings: string[]
}

export type ExecutionTransactionType = 'legacy' | 'eip1559'

export type ExecutionReceiptLog = {
  address: string
  topics: string[]
  data: string
  logIndex?: number
}

export type ExecutionReceipt = {
  txHash: string
  blockHash?: string
  blockNumber?: number
  transactionIndex?: number
  contractAddress?: string
  gasUsed?: string
  cumulativeGasUsed?: string
  effectiveGasPrice?: string
  success?: boolean
  logs: ExecutionReceiptLog[]
}

export type ExecutionTransactionRequest = {
  chainKey: string
  chainId?: number
  type?: ExecutionTransactionType
  from: string
  to?: string
  nonce?: number
  gas?: string
  gasPrice?: string
  maxPriorityFeePerGas?: string
  maxFeePerGas?: string
  value: string
  data: string
}

export type ExecutionStatus = {
  txHash: string
  status: 'prepared' | 'submitted' | 'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  errorReason?: string
  simulation?: ExecutionSimulation
  preflight?: ExecutionPreflightDecision
  transaction?: ExecutionTransactionRequest
  receipt?: ExecutionReceipt
  nonce?: number
  confirmations?: number
  rpcUrl?: string
  observedAtMs?: number
  submittedVia?: 'mock' | 'rpc_send' | 'rpc_sendTransaction' | 'rpc_sendRawTransaction' | 'external' | 'not_submitted'
  replacementForTxHash?: string
  warnings?: string[]
}

export type BridgeQuote = {
  provider: string
  sourceChain: string
  destinationChain: string
  sourceAsset: string
  destinationAsset: string
  amountIn: string
  estimatedAmountOut: string
  estimatedTimeSec: number
  requiresManualRedeem: boolean
  gasTokenRequired: string
  warnings: string[]
}

export type RiskCheckResult = {
  name: string
  passed: boolean
  severity: 'warning' | 'error'
  message?: string
  metadata?: Record<string, unknown>
}

export type RiskEvaluation = {
  approved: boolean
  checks: RiskCheckResult[]
  warnings: string[]
}

export type DiscoveryMode = 'seeded' | 'live_rpc' | 'env_override'

export type ResolvedAssetReference = {
  chainKey: string
  input: string
  symbol: string
  address?: string
  decimals?: number
  source: 'input' | 'metadata' | 'builtin' | 'unresolved'
}

export type AaveReserveState = {
  chainKey: string
  poolAddress: string
  asset: string
  symbol: string
  decimals: number
  isActive: boolean
  isFrozen: boolean
  borrowingEnabled: boolean
  paused: boolean
  flashLoanEnabled: boolean
  borrowCap: string
  supplyCap: string
  configBits: string
  discoveredAtMs: number
  discoveryMode: DiscoveryMode
  warnings: string[]
}

export type UniswapV3PoolSnapshot = {
  chainKey: string
  factoryAddress: string
  routerAddress?: string
  poolAddress: string
  tokenIn: string
  tokenOut: string
  feeTier: number
  swapFeeBps: number
  sqrtPriceX96: string
  liquidity: string
  tick: number
  estimatedAmountOut: string
  liquidityScore: number
  confidence: number
  discoveredAtMs: number
  quoteModel: string
  warnings: string[]
}

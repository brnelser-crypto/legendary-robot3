import { ChainRegistry } from '@mde/chains'
import { chainKeyToEnvSuffix, isHexAddress, resolveRpcUrl } from '@mde/protocols'
import { loadExecutionPreflightPolicy, type ExecutionPreflightPolicy } from './policy.js'
import { loadExecutionReplacementPolicy, type ExecutionReplacementPolicy } from './replacement.js'
import { loadExecutionSignerConfig, type ExecutionSignerConfig } from './signer.js'

export type ExecutionEnvironmentIssue = {
  level: 'warning' | 'error'
  code: string
  message: string
}

export type ExecutionEnvironmentSummary = {
  ok: boolean
  checkedChains: string[]
  configuredRpcChains: string[]
  operatorAddress?: string
  routeExecutorAddress?: string
  aaveReceiverAddress?: string
  executionStorePath?: string
  preflightPolicy: ExecutionPreflightPolicy
  signerConfig: ExecutionSignerConfig
  replacementPolicy: ExecutionReplacementPolicy
  issues: ExecutionEnvironmentIssue[]
}

const DEFAULT_CHECKED_CHAIN_KEYS = ['ethereum', 'arbitrum', 'base']
const VALID_SIGNER_MODES = new Set(['mock', 'rpc_unlocked', 'raw', 'external'])

export function validateExecutionEnvironment(options: {
  env?: NodeJS.ProcessEnv
  chainRegistry?: ChainRegistry
  chainKeys?: string[]
} = {}): ExecutionEnvironmentSummary {
  const env = options.env ?? process.env
  const chainRegistry = options.chainRegistry ?? new ChainRegistry()
  const preflightPolicy = loadExecutionPreflightPolicy(env)
  const signerConfig = loadExecutionSignerConfig(env)
  const replacementPolicy = loadExecutionReplacementPolicy(env)
  const issues: ExecutionEnvironmentIssue[] = []

  const checkedChains = [...new Set((options.chainKeys?.length ? options.chainKeys : DEFAULT_CHECKED_CHAIN_KEYS).filter(Boolean))]
  const configuredRpcChains: string[] = []

  const routeExecutorAddress = env.ROUTE_EXECUTOR_ADDRESS?.trim() || undefined
  const operatorAddress = env.ENGINE_OPERATOR_ADDRESS?.trim() || undefined
  const aaveReceiverAddress = env.AAVE_RECEIVER_ADDRESS?.trim() || undefined
  const executionStorePath = env.EXECUTION_STORE_PATH?.trim() || undefined
  const signerMode = env.EXECUTION_SIGNER_MODE?.trim() || 'mock'

  if (!routeExecutorAddress) {
    issues.push({
      level: 'error',
      code: 'route_executor_unset',
      message: 'ROUTE_EXECUTOR_ADDRESS is required for execution payload submission',
    })
  } else if (!isHexAddress(routeExecutorAddress)) {
    issues.push({
      level: 'error',
      code: 'route_executor_invalid',
      message: 'ROUTE_EXECUTOR_ADDRESS is set but is not a valid EVM address',
    })
  }

  if (!operatorAddress) {
    issues.push({
      level: preflightPolicy.requirePreflight || signerConfig.mode !== 'mock' ? 'error' : 'warning',
      code: 'engine_operator_unset',
      message: 'ENGINE_OPERATOR_ADDRESS is unset; simulation and signer flows cannot impersonate the operator',
    })
  } else if (!isHexAddress(operatorAddress)) {
    issues.push({
      level: 'error',
      code: 'engine_operator_invalid',
      message: 'ENGINE_OPERATOR_ADDRESS is set but is not a valid EVM address',
    })
  }

  if (!aaveReceiverAddress) {
    issues.push({
      level: 'warning',
      code: 'aave_receiver_unset',
      message: 'AAVE_RECEIVER_ADDRESS is unset; Aave flash-envelope execution bindings remain incomplete',
    })
  } else if (!isHexAddress(aaveReceiverAddress)) {
    issues.push({
      level: 'error',
      code: 'aave_receiver_invalid',
      message: 'AAVE_RECEIVER_ADDRESS is set but is not a valid EVM address',
    })
  }

  if (!executionStorePath) {
    issues.push({
      level: 'warning',
      code: 'execution_store_unset',
      message: 'EXECUTION_STORE_PATH is unset; execution/job state remains process-local and backfill workers will not share state across restarts',
    })
  }

  if (!VALID_SIGNER_MODES.has(signerMode)) {
    issues.push({
      level: 'error',
      code: 'signer_mode_invalid',
      message: 'EXECUTION_SIGNER_MODE must be one of mock, rpc_unlocked, raw, or external',
    })
  }

  if (signerConfig.mode === 'raw') {
    issues.push({
      level: 'warning',
      code: 'raw_signer_runtime_dependency',
      message: 'Raw signer mode requires an injected signTransaction callback at runtime',
    })
  }

  if (signerConfig.mode === 'external') {
    issues.push({
      level: 'warning',
      code: 'external_signer_handoff',
      message: 'External signer mode prepares transactions for out-of-process signing; use /jobs/:jobId/transaction and /transactions/submit-raw to complete submission',
    })
  }

  validateIntegerSetting(env.EXECUTION_CONFIRMATIONS, 'EXECUTION_CONFIRMATIONS', 1, issues)
  validateIntegerSetting(env.EXECUTION_RECEIPT_POLL_MS, 'EXECUTION_RECEIPT_POLL_MS', 0, issues)
  validateIntegerSetting(env.EXECUTION_RECEIPT_TIMEOUT_MS, 'EXECUTION_RECEIPT_TIMEOUT_MS', 0, issues)
  validateIntegerSetting(env.EXECUTION_GAS_LIMIT_BPS, 'EXECUTION_GAS_LIMIT_BPS', 10_000, issues)
  validateIntegerSetting(env.EXECUTION_REPLACEMENT_MAX_ATTEMPTS, 'EXECUTION_REPLACEMENT_MAX_ATTEMPTS', 1, issues)
  validateIntegerSetting(env.EXECUTION_REPLACEMENT_MIN_AGE_MS, 'EXECUTION_REPLACEMENT_MIN_AGE_MS', 0, issues)
  validateIntegerSetting(env.EXECUTION_REPLACEMENT_GAS_BUMP_BPS, 'EXECUTION_REPLACEMENT_GAS_BUMP_BPS', 10_000, issues)
  validateIntegerSetting(env.EXECUTION_BACKFILL_INTERVAL_MS, 'EXECUTION_BACKFILL_INTERVAL_MS', 0, issues)
  validateIntegerSetting(env.EXECUTION_BACKFILL_BATCH_SIZE, 'EXECUTION_BACKFILL_BATCH_SIZE', 1, issues)

  const pollMs = parseInteger(env.EXECUTION_RECEIPT_POLL_MS)
  const timeoutMs = parseInteger(env.EXECUTION_RECEIPT_TIMEOUT_MS)
  if (pollMs !== undefined && timeoutMs !== undefined && timeoutMs < pollMs) {
    issues.push({
      level: 'error',
      code: 'receipt_timeout_lt_poll',
      message: 'EXECUTION_RECEIPT_TIMEOUT_MS must be greater than or equal to EXECUTION_RECEIPT_POLL_MS',
    })
  }

  for (const chainKey of checkedChains) {
    const chain = chainRegistry.get(chainKey)
    if (!chain) {
      issues.push({
        level: 'warning',
        code: 'unknown_chain',
        message: `Chain ${chainKey} is not present in the registry`,
      })
      continue
    }

    const rpcUrl = resolveRpcUrl(chainKey, chain.rpcUrls, env)
    if (rpcUrl) {
      configuredRpcChains.push(chainKey)
    } else {
      issues.push({
        level: preflightPolicy.requirePreflight || signerConfig.mode !== 'mock' ? 'error' : 'warning',
        code: 'rpc_unset',
        message: `No RPC URL resolved for ${chainKey}; set ${chainKeyToEnvSuffix(chainKey)}_RPC_URL to enable simulation and submission`,
      })
    }

    const simulationFromKey = `${chainKeyToEnvSuffix(chainKey)}_SIMULATION_FROM`
    const simulationFromValue = env[simulationFromKey]?.trim()
    if (simulationFromValue && !isHexAddress(simulationFromValue)) {
      issues.push({
        level: 'error',
        code: 'simulation_from_invalid',
        message: `${simulationFromKey} is set but is not a valid EVM address`,
      })
    }
  }

  return {
    ok: issues.every((issue) => issue.level !== 'error'),
    checkedChains,
    configuredRpcChains,
    operatorAddress,
    routeExecutorAddress,
    aaveReceiverAddress,
    executionStorePath,
    preflightPolicy,
    signerConfig,
    replacementPolicy,
    issues,
  }
}

function parseInteger(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function validateIntegerSetting(
  value: string | undefined,
  key: string,
  min: number,
  issues: ExecutionEnvironmentIssue[]
): void {
  if (value === undefined || value === '') return
  const parsed = parseInteger(value)
  if (parsed === undefined) {
    issues.push({
      level: 'error',
      code: 'invalid_integer',
      message: `${key} must be a base-10 integer`,
    })
    return
  }

  if (parsed < min) {
    issues.push({
      level: 'error',
      code: 'integer_below_minimum',
      message: `${key} must be greater than or equal to ${min}`,
    })
  }
}

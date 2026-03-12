import { createHash } from 'node:crypto'
import { safeBigInt } from './utils.js'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const ROUTE_EXECUTOR_SELECTORS = {
  executeAtomicAavePlan: '0xf3f77c9c',
  executeSwapPlan: '0x674b61a1',
  executeAtomicDydxPlan: '0xc7a1506b',
} as const

export type ExecutorStepPlan = {
  stepId: string
  action: string
  poolAddress?: string
  routerAddress?: string
  tokenIn?: string
  tokenOut?: string
  feeTier?: number
  amountIn?: string
  minAmountOut?: string
  deadlineMs?: number
  auxData?: string
}

export type AtomicAavePlan = {
  routeId: string
  repaymentAsset: string
  principal: string
  amountOwed: string
  deadline: number
  aavePool: string
  receiver: string
  borrowAsset: string
  borrowAmount: string
  swapSteps: ExecutorStepPlan[]
}

export type SwapPlan = {
  routeId: string
  deadline: number
  atomic: boolean
  swapSteps: ExecutorStepPlan[]
}

export type AtomicDydxPlan = {
  routeId: string
  repaymentAsset: string
  principal: string
  amountOwed: string
  deadline: number
  soloMargin: string
  marketId: number
  borrowAsset: string
  borrowAmount: string
  swapSteps: ExecutorStepPlan[]
}

export type CalldataEnvelopeSummary = {
  selector?: string
  method?: string
  bodyLengthBytes?: number
}

const ACTION_CODES: Record<string, number> = {
  swap: 1,
  exact_input_single: 1,
  stable_swap: 2,
  curve_exchange: 2,
  route_processor: 3,
  operate: 4,
  flash_borrow: 5,
  repay_flash_loan: 6,
}

const SELECTOR_TO_METHOD = Object.fromEntries(
  Object.entries(ROUTE_EXECUTOR_SELECTORS).map(([method, selector]) => [selector, method])
) as Record<string, keyof typeof ROUTE_EXECUTOR_SELECTORS>

export function isAddress(value: string | undefined): value is string {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value))
}

export function coerceAddress(value: string | undefined): string {
  return isAddress(value) ? value : ZERO_ADDRESS
}

export function toExecutionDeadlineSeconds(value: number | string | undefined): number {
  if (value === undefined || value === null || value === '') {
    return Math.floor(Date.now() / 1000) + 120
  }

  const numeric = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return Math.floor(Date.now() / 1000) + 120
  }

  return numeric > 1_000_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric)
}

export function textToBytes32(text: string): string {
  return `0x${createHash('sha256').update(text).digest('hex')}`
}

export function routeIdToBytes32(routeId: string): string {
  return textToBytes32(routeId)
}

export function decodeCalldataEnvelope(data: string): CalldataEnvelopeSummary | undefined {
  if (!data || !data.startsWith('0x')) return undefined
  const raw = data.slice(2)
  if (raw.length < 8) return undefined

  const selector = `0x${raw.slice(0, 8)}`
  const method = SELECTOR_TO_METHOD[selector]
  if (!method) return { selector }

  let bodyLengthBytes: number | undefined
  if (raw.length >= 136) {
    try {
      bodyLengthBytes = Number(BigInt(`0x${raw.slice(72, 136)}`))
    } catch {
      bodyLengthBytes = undefined
    }
  }

  return { selector, method, bodyLengthBytes }
}

export function encodeAtomicAavePlanCall(plan: AtomicAavePlan): string {
  return encodeBytesCall(ROUTE_EXECUTOR_SELECTORS.executeAtomicAavePlan, encodeAtomicAavePlanBody(plan))
}

export function encodeSwapPlanCall(plan: SwapPlan): string {
  return encodeBytesCall(ROUTE_EXECUTOR_SELECTORS.executeSwapPlan, encodeSwapPlanBody(plan))
}

export function encodeAtomicDydxPlanCall(plan: AtomicDydxPlan): string {
  return encodeBytesCall(ROUTE_EXECUTOR_SELECTORS.executeAtomicDydxPlan, encodeAtomicDydxPlanBody(plan))
}

function encodeAtomicAavePlanBody(plan: AtomicAavePlan): string {
  const steps = encodeStepArray(plan.swapSteps)
  const head = [
    bytes32Word(routeIdToBytes32(plan.routeId)),
    addressWord(plan.repaymentAsset),
    uintWord(plan.principal),
    uintWord(plan.amountOwed),
    uintWord(plan.deadline),
    addressWord(plan.aavePool),
    addressWord(plan.receiver),
    addressWord(plan.borrowAsset),
    uintWord(plan.borrowAmount),
    uintWord(10 * 32),
  ].join('')
  return `0x${head}${steps}`
}

function encodeSwapPlanBody(plan: SwapPlan): string {
  const steps = encodeStepArray(plan.swapSteps)
  const head = [
    bytes32Word(routeIdToBytes32(plan.routeId)),
    uintWord(plan.deadline),
    boolWord(plan.atomic),
    uintWord(4 * 32),
  ].join('')
  return `0x${head}${steps}`
}

function encodeAtomicDydxPlanBody(plan: AtomicDydxPlan): string {
  const steps = encodeStepArray(plan.swapSteps)
  const head = [
    bytes32Word(routeIdToBytes32(plan.routeId)),
    addressWord(plan.repaymentAsset),
    uintWord(plan.principal),
    uintWord(plan.amountOwed),
    uintWord(plan.deadline),
    addressWord(plan.soloMargin),
    uintWord(plan.marketId),
    addressWord(plan.borrowAsset),
    uintWord(plan.borrowAmount),
    uintWord(10 * 32),
  ].join('')
  return `0x${head}${steps}`
}

function encodeStepArray(steps: ExecutorStepPlan[]): string {
  return `${uintWord(steps.length)}${steps.map(encodeStep).join('')}`
}

function encodeStep(step: ExecutorStepPlan): string {
  return [
    bytes32Word(textToBytes32(step.stepId)),
    uintWord(ACTION_CODES[step.action] ?? ACTION_CODES.swap),
    addressWord(step.poolAddress),
    addressWord(step.routerAddress),
    addressWord(step.tokenIn),
    addressWord(step.tokenOut),
    uintWord(step.feeTier ?? 0),
    uintWord(step.amountIn ?? '0'),
    uintWord(step.minAmountOut ?? '0'),
    uintWord(toExecutionDeadlineSeconds(step.deadlineMs)),
    bytes32Word(step.auxData ? textToBytes32(step.auxData) : textToBytes32('')), 
  ].join('')
}

function encodeBytesCall(selector: string, bytesValue: string): string {
  const raw = strip0x(bytesValue)
  const padded = padRightToWord(raw)
  return `0x${strip0x(selector)}${uintWord(32)}${uintWord(raw.length / 2)}${padded}`
}

function addressWord(value: string | undefined): string {
  return coerceAddress(value).toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

function uintWord(value: string | number | bigint): string {
  return safeBigInt(value as string | number | bigint).toString(16).padStart(64, '0')
}

function boolWord(value: boolean): string {
  return value ? uintWord(1) : uintWord(0)
}

function bytes32Word(value: string): string {
  const raw = strip0x(value)
  return raw.padStart(64, '0').slice(0, 64)
}

function padRightToWord(rawHex: string): string {
  if (!rawHex) return ''
  const size = Math.ceil(rawHex.length / 64) * 64
  return rawHex.padEnd(size, '0')
}

function strip0x(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value
}

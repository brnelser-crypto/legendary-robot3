export type JsonRpcTransport = {
  request(method: string, params?: unknown[]): Promise<unknown>
}

export class FetchJsonRpcTransport implements JsonRpcTransport {
  private static nextId = 1

  constructor(
    readonly rpcUrl: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async request(method: string, params: unknown[] = []): Promise<unknown> {
    const response = await this.fetchImpl(this.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: FetchJsonRpcTransport.nextId++,
        method,
        params,
      }),
    })

    if (!response.ok) {
      throw new Error(`RPC ${method} failed with HTTP ${response.status}`)
    }

    const payload = (await response.json()) as {
      result?: unknown
      error?: { code?: number; message?: string }
    }

    if (payload.error) {
      throw new Error(
        `RPC ${method} error ${payload.error.code ?? 'unknown'}: ${payload.error.message ?? 'unknown error'}`
      )
    }

    return payload.result
  }
}

export function chainKeyToEnvSuffix(chainKey: string): string {
  return chainKey.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
}

export function resolveEnvTemplate(
  value: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const match = trimmed.match(/^\$\{([A-Z0-9_]+)\}$/)
  if (!match) return trimmed

  const resolved = env[match[1]]
  return resolved && resolved.trim() ? resolved.trim() : undefined
}

export function resolveRpcUrl(
  chainKey: string,
  configuredUrls: string[] = [],
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const envDirect = env[`${chainKeyToEnvSuffix(chainKey)}_RPC_URL`]
  if (envDirect?.trim()) return envDirect.trim()

  for (const url of configuredUrls) {
    const resolved = resolveEnvTemplate(url, env)
    if (resolved) return resolved
  }

  return undefined
}

export function createFetchTransport(
  chainKey: string,
  configuredUrls: string[] = [],
  env: NodeJS.ProcessEnv = process.env
): FetchJsonRpcTransport | undefined {
  const rpcUrl = resolveRpcUrl(chainKey, configuredUrls, env)
  return rpcUrl ? new FetchJsonRpcTransport(rpcUrl) : undefined
}

export function isHexAddress(value: string | undefined): value is string {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value))
}

export function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

export function buildCallData(selector: string, encodedParams: string[] = []): string {
  const head = selector.startsWith('0x') ? selector.slice(2) : selector
  return `0x${head}${encodedParams.join('')}`
}

export function encodeAddress(address: string): string {
  if (!isHexAddress(address)) {
    throw new Error(`Invalid address: ${address}`)
  }

  return address.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

export function encodeUint(value: bigint | number): string {
  const bigintValue = typeof value === 'number' ? BigInt(Math.trunc(value)) : value
  return bigintValue.toString(16).padStart(64, '0')
}

export function splitWords(data: string): string[] {
  const raw = data.startsWith('0x') ? data.slice(2) : data
  if (!raw) return []

  const words: string[] = []
  for (let index = 0; index < raw.length; index += 64) {
    words.push(raw.slice(index, index + 64).padEnd(64, '0'))
  }
  return words
}

export function decodeUint256(data: string, wordIndex = 0): bigint {
  const word = splitWords(data)[wordIndex]
  if (!word) return 0n
  return BigInt(`0x${word}`)
}

export function decodeInt256(data: string, wordIndex = 0): bigint {
  const value = decodeUint256(data, wordIndex)
  const signBit = 1n << 255n
  const max = 1n << 256n
  return value >= signBit ? value - max : value
}

export function decodeAddress(data: string, wordIndex = 0): string {
  const word = splitWords(data)[wordIndex]
  if (!word) return '0x0000000000000000000000000000000000000000'
  return `0x${word.slice(24)}`
}

export async function ethCall(
  transport: JsonRpcTransport,
  to: string,
  data: string,
  blockTag: string = 'latest'
): Promise<string> {
  const result = await transport.request('eth_call', [{ to, data }, blockTag])
  if (typeof result !== 'string') {
    throw new Error('RPC eth_call result was not a hex string')
  }
  return result
}

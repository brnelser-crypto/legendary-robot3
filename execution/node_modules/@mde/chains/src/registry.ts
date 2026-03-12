import type { ChainConfig } from '@mde/domain'
import { CHAINS } from './seeds.js'

export class ChainRegistry {
  private readonly chainsByKey = new Map<string, ChainConfig>()

  constructor(seed: ChainConfig[] = CHAINS) {
    for (const chain of seed) {
      this.chainsByKey.set(chain.chainKey, chain)
    }
  }

  list(): ChainConfig[] {
    return [...this.chainsByKey.values()]
  }

  get(chainKey: string): ChainConfig | undefined {
    return this.chainsByKey.get(chainKey)
  }

  getByProtocol(protocolKey: string): ChainConfig[] {
    return this.list().filter((chain) => chain.protocolKeys.includes(protocolKey))
  }
}

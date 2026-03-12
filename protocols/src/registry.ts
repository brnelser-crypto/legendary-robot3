import type { ProtocolDeployment } from '@mde/domain'
import { PROTOCOL_DEPLOYMENTS } from './deployments.js'

export class ProtocolRegistry {
  private readonly items: ProtocolDeployment[]

  constructor(seed: ProtocolDeployment[] = PROTOCOL_DEPLOYMENTS) {
    this.items = seed
  }

  list(): ProtocolDeployment[] {
    return [...this.items]
  }

  getByProtocol(protocolKey: string): ProtocolDeployment[] {
    return this.items.filter((item) => item.protocolKey === protocolKey)
  }

  getByProtocolAndChain(protocolKey: string, chainKey: string): ProtocolDeployment[] {
    return this.items.filter((item) => item.protocolKey === protocolKey && item.chainKey === chainKey)
  }

  getByChain(chainKey: string): ProtocolDeployment[] {
    return this.items.filter((item) => item.chainKey === chainKey)
  }
}

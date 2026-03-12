import type {
  ExecutionPayload,
  ExecutionStatus,
  PlannedRoute,
  RouteInput,
  RouteQuote,
  ValidationResult,
} from '@mde/domain'

export interface ProtocolAdapter {
  readonly protocolKey: string
  quote(routeInput: RouteInput): Promise<RouteQuote[]>
  validate(route: PlannedRoute): Promise<ValidationResult>
  buildExecution(route: PlannedRoute): Promise<ExecutionPayload>
  monitor(txHash: string): Promise<ExecutionStatus>
}

export abstract class BaseAdapter implements ProtocolAdapter {
  abstract readonly protocolKey: string

  abstract quote(routeInput: RouteInput): Promise<RouteQuote[]>
  abstract validate(route: PlannedRoute): Promise<ValidationResult>
  abstract buildExecution(route: PlannedRoute): Promise<ExecutionPayload>

  async monitor(txHash: string): Promise<ExecutionStatus> {
    return {
      txHash,
      status: 'pending',
    }
  }
}

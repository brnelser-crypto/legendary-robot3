import type { ExecutionJob } from '@mde/domain'
import { sharesLock } from './locks.js'

export class ConcurrencyManager {
  canRunTogether(existing: ExecutionJob[], candidate: ExecutionJob): boolean {
    return !existing.some((job) => sharesLock(job, candidate))
  }

  schedule(existing: ExecutionJob[], candidates: ExecutionJob[]): ExecutionJob[] {
    const admitted: ExecutionJob[] = []
    for (const candidate of candidates) {
      if (this.canRunTogether([...existing, ...admitted], candidate)) {
        admitted.push(candidate)
      }
    }
    return admitted
  }
}

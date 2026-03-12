export class InMemoryMetrics {
  private readonly counters = new Map<string, number>()

  increment(metric: string, value = 1): void {
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + value)
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters.entries())
  }
}

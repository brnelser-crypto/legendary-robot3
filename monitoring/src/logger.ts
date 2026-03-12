export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export class Logger {
  constructor(private readonly scope: string) {}

  private write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry = {
      ts: new Date().toISOString(),
      level,
      scope: this.scope,
      message,
      ...(context ?? {}),
    }
    console.log(JSON.stringify(entry))
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.write('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write('error', message, context)
  }
}

export const createLogger = (scope: string): Logger => new Logger(scope)

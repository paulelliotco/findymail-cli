export type ErrorType = 'usage' | 'config' | 'api' | 'network' | 'timeout' | 'internal'

export class CliError extends Error {
  readonly type: ErrorType
  readonly exitCode: number
  readonly status?: number
  readonly endpoint?: string
  readonly details?: unknown

  constructor(options: {
    type: ErrorType
    message: string
    exitCode: number
    status?: number
    endpoint?: string
    details?: unknown
  }) {
    super(options.message)
    this.name = 'CliError'
    this.type = options.type
    this.exitCode = options.exitCode
    this.status = options.status
    this.endpoint = options.endpoint
    this.details = options.details
  }
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error
  }

  if (error instanceof Error) {
    return new CliError({
      type: 'internal',
      message: error.message,
      exitCode: 1,
    })
  }

  return new CliError({
    type: 'internal',
    message: 'Unknown error',
    exitCode: 1,
  })
}

import { CliError } from './errors.js'

export function writeSuccess(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data)}\n`)
}

export function writeError(error: CliError): void {
  const payload: Record<string, unknown> = {
    ok: false,
    error: {
      type: error.type,
      message: error.message,
    },
  }

  const errorDetails = payload.error as Record<string, unknown>
  if (error.status !== undefined) {
    errorDetails.status = error.status
  }
  if (error.endpoint !== undefined) {
    errorDetails.endpoint = error.endpoint
  }
  if (error.details !== undefined) {
    errorDetails.details = error.details
  }

  process.stderr.write(`${JSON.stringify(payload)}\n`)
}

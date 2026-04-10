import { CliError } from './errors.js'

const DEFAULT_BASE_URL = 'https://app.findymail.com'
const DEFAULT_TIMEOUT_MS = 30_000

export type RuntimeConfig = {
  apiKey: string
  baseUrl: string
  timeoutMs: number
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  const apiKey = env.FINDYMAIL_API_KEY?.trim()
  if (!apiKey) {
    throw new CliError({
      type: 'config',
      message: 'FINDYMAIL_API_KEY is not set',
      exitCode: 2,
    })
  }

  const baseUrl = env.FINDYMAIL_BASE_URL?.trim() || DEFAULT_BASE_URL
  const timeoutMs = parseTimeoutMs(env.FINDYMAIL_TIMEOUT_MS)

  return {
    apiKey,
    baseUrl,
    timeoutMs,
  }
}

function parseTimeoutMs(value: string | undefined): number {
  if (!value) {
    return DEFAULT_TIMEOUT_MS
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError({
      type: 'config',
      message: 'FINDYMAIL_TIMEOUT_MS must be a positive integer',
      exitCode: 2,
    })
  }

  return parsed
}

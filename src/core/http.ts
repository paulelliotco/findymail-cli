import { CliError } from './errors.js'

type BaseRequestOptions = {
  baseUrl: string
  apiKey: string
  path: string
  timeoutMs: number
}

type RequestOptions = BaseRequestOptions & {
  method: 'GET' | 'POST' | 'DELETE'
  body?: unknown
}

export async function postJson(options: BaseRequestOptions & { body: unknown }): Promise<unknown> {
  return await requestJson({
    ...options,
    method: 'POST',
  })
}

export async function getJson(options: BaseRequestOptions): Promise<unknown> {
  return await requestJson({
    ...options,
    method: 'GET',
  })
}

export async function deleteJson(options: BaseRequestOptions): Promise<unknown> {
  return await requestJson({
    ...options,
    method: 'DELETE',
  })
}

async function requestJson(options: RequestOptions): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(`${options.baseUrl}${options.path}`, {
      method: options.method,
      signal: AbortSignal.timeout(options.timeoutMs),
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    })
  } catch (error) {
    throw new CliError({
      type: isTimeoutError(error) ? 'timeout' : 'network',
      message: error instanceof Error ? error.message : 'Network request failed',
      exitCode: 1,
      endpoint: options.path,
    })
  }

  const payload = await parsePayload(response, options.path)

  if (!response.ok) {
    throw new CliError({
      type: 'api',
      message: typeof payload === 'string' ? payload : `Findymail request failed with status ${response.status}`,
      exitCode: 1,
      status: response.status,
      endpoint: options.path,
      details: typeof payload === 'string' ? undefined : payload,
    })
  }

  return payload
}

async function parsePayload(response: Response, path: string): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text()
  if (text.length === 0) {
    return null
  }

  if (!contentType.includes('application/json')) {
    return text
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new CliError({
      type: 'api',
      message: 'Findymail returned invalid JSON',
      exitCode: 1,
      status: response.status,
      endpoint: path,
      details: { rawBody: text },
    })
  }
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

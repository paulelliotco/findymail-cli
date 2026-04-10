import { afterEach, describe, expect, it, vi } from 'vitest'

import { getJson, postJson } from '../../src/core/http.js'

describe('http helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))

    await expect(getJson({
      apiKey: 'test-key',
      baseUrl: 'http://example.com',
      path: '/api/lists',
      timeoutMs: 1000,
    })).resolves.toBeNull()
  })

  it('maps malformed JSON responses to structured API errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    await expect(postJson({
      apiKey: 'test-key',
      baseUrl: 'http://example.com',
      path: '/api/verify',
      timeoutMs: 1000,
      body: { email: 'ada@example.com' },
    })).rejects.toMatchObject({
      type: 'api',
      message: 'Findymail returned invalid JSON',
      endpoint: '/api/verify',
      status: 200,
    })
  })

  it('maps request timeouts to structured timeout errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => await new Promise((_, reject) => {
      const signal = init?.signal
      signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }))
      })
    })))

    await expect(postJson({
      apiKey: 'test-key',
      baseUrl: 'http://example.com',
      path: '/api/verify',
      timeoutMs: 10,
      body: { email: 'ada@example.com' },
    })).rejects.toMatchObject({
      type: 'timeout',
      endpoint: '/api/verify',
    })
  })
})

import { afterEach, describe, expect, it } from 'vitest'

import { runCli } from '../helpers/cli'
import { startJsonServer } from '../helpers/server'

const cwd = '/Users/paul/CascadeProjects/contributions/findymail-cli'

describe('intellimatch commands', () => {
  afterEach(() => {
    delete process.env.FINDYMAIL_API_KEY
    delete process.env.FINDYMAIL_BASE_URL
  })

  it('starts an intellimatch search with POST /api/intellimatch/search', async () => {
    const server = await startJsonServer(() => ({ body: { hash: 'job-123' } }))

    const result = await runCli(['intellimatch', 'search', '--json', '{"query":"SaaS companies in US"}'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({ hash: 'job-123' })
    expect(server.requests[0]).toEqual({
      method: 'POST',
      url: '/api/intellimatch/search',
      auth: 'Bearer test-key',
      body: '{"query":"SaaS companies in US"}',
    })
  })

  it('checks intellimatch status with GET /api/intellimatch/status?hash=...', async () => {
    const server = await startJsonServer(() => ({ body: { status: 'completed' } }))

    const result = await runCli(['intellimatch', 'status', '--hash', 'job-123'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({ status: 'completed' })
    expect(server.requests[0]).toEqual({
      method: 'GET',
      url: '/api/intellimatch/status?hash=job-123',
      auth: 'Bearer test-key',
      body: '',
    })
  })

  it('waits for a terminal intellimatch status when --wait is used', async () => {
    const server = await startJsonServer((_, index) => {
      if (index === 0) {
        return { body: { hash: 'job-123' } }
      }

      if (index === 1) {
        return { body: { status: 'running' } }
      }

      return { body: { status: 'completed' } }
    })

    const result = await runCli([
      'intellimatch',
      'search',
      '--json',
      '{"query":"SaaS companies in US"}',
      '--wait',
      '--poll-interval',
      '1',
      '--max-wait',
      '25',
    ], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({ status: 'completed' })
    expect(server.requests.map((request) => request.url)).toEqual([
      '/api/intellimatch/search',
      '/api/intellimatch/status?hash=job-123',
      '/api/intellimatch/status?hash=job-123',
    ])
  })

  it('returns a structured error when a waited intellimatch job fails', async () => {
    const server = await startJsonServer((_, index) => {
      if (index === 0) {
        return { body: { hash: 'job-123' } }
      }

      return { body: { status: 'FAILED', reason: 'quota exceeded' } }
    })

    const result = await runCli([
      'intellimatch',
      'search',
      '--json',
      '{"query":"SaaS companies in US"}',
      '--wait',
      '--poll-interval',
      '1',
      '--max-wait',
      '25',
    ], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'api',
        message: 'Intellimatch job failed',
        endpoint: '/api/intellimatch/status?hash=job-123',
        details: { status: 'FAILED', reason: 'quota exceeded' },
      },
    })
  })

  it('treats a missing hash from intellimatch search as an API error in waited mode', async () => {
    const server = await startJsonServer(() => ({ body: { queued: true } }))

    const result = await runCli([
      'intellimatch',
      'search',
      '--json',
      '{"query":"SaaS companies in US"}',
      '--wait',
      '--poll-interval',
      '1',
      '--max-wait',
      '25',
    ], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'api',
        message: 'Intellimatch search response did not include a usable hash',
        endpoint: '/api/intellimatch/search',
        details: { queued: true },
      },
    })
  })

  it('returns structured usage errors for invalid intellimatch search JSON', async () => {
    const result = await runCli(['intellimatch', 'search', '--json', '{'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key' },
    })

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'usage',
        message: 'Input is not valid JSON',
      },
    })
  })

  it('returns structured usage errors when status hash is missing', async () => {
    const result = await runCli(['intellimatch', 'status'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key' },
    })

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'usage',
        message: "required option '--hash <hash>' not specified",
      },
    })
  })

  it('returns structured API errors for intellimatch status', async () => {
    const server = await startJsonServer(() => ({ status: 429, body: { error: 'slow down' } }))

    const result = await runCli(['intellimatch', 'status', '--hash', 'job-123'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'api',
        message: 'Findymail request failed with status 429',
        status: 429,
        endpoint: '/api/intellimatch/status?hash=job-123',
        details: { error: 'slow down' },
      },
    })
  })

  it('rejects invalid polling values', async () => {
    const result = await runCli([
      'intellimatch',
      'search',
      '--json',
      '{"query":"SaaS companies in US"}',
      '--wait',
      '--poll-interval',
      '0',
      '--max-wait',
      'nope',
    ], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key' },
    })

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'usage',
        message: '--poll-interval and --max-wait must be positive integers in milliseconds',
      },
    })
  })

  it('requires a subcommand for the intellimatch namespace', async () => {
    const result = await runCli(['intellimatch'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key' },
    })

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'usage',
        message: 'Use a subcommand for intellimatch',
      },
    })
  })
})

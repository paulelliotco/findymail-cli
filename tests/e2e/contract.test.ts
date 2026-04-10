import { createServer } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'

import { runCli } from '../helpers/cli'

const cwd = '/Users/paul/CascadeProjects/contributions/findymail-cli'

describe('CLI contract', () => {
  afterEach(() => {
    delete process.env.FINDYMAIL_API_KEY
    delete process.env.FINDYMAIL_BASE_URL
  })

  it('shows layered help at the top level', async () => {
    const result = await runCli(['--help'], { cwd, env: process.env })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Usage:')
    expect(result.stdout).toContain('verify')
    expect(result.stdout).toContain('search')
  })

  it('fails early with a structured config error when the API key is missing', async () => {
    const result = await runCli(['verify', '--json', '{"email":"test@example.com"}'], {
      cwd,
      env: {
        ...process.env,
        FINDYMAIL_API_KEY: '',
      },
    })

    expect(result.exitCode).toBe(2)
    expect(result.stdout).toBe('')

    const parsed = JSON.parse(result.stderr)
    expect(parsed).toEqual({
      ok: false,
      error: {
        type: 'config',
        message: 'FINDYMAIL_API_KEY is not set',
      },
    })
  })

  it('posts verify requests and prints raw API JSON to stdout', async () => {
    const requests: Array<{ method?: string; url?: string; auth?: string; body: string }> = []

    const server = createServer(async (req, res) => {
      let body = ''
      for await (const chunk of req) {
        body += chunk
      }

      requests.push({
        method: req.method,
        url: req.url,
        auth: req.headers.authorization,
        body,
      })

      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ email: 'test@example.com', verified: true, provider: 'Google' }))
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0

    const result = await runCli(['verify', '--json', '{"email":"test@example.com"}'], {
      cwd,
      env: {
        ...process.env,
        FINDYMAIL_API_KEY: 'test-key',
        FINDYMAIL_BASE_URL: `http://127.0.0.1:${port}`,
      },
    })

    server.close()

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    expect(JSON.parse(result.stdout)).toEqual({
      email: 'test@example.com',
      verified: true,
      provider: 'Google',
    })
    expect(requests).toEqual([
      {
        method: 'POST',
        url: '/api/verify',
        auth: 'Bearer test-key',
        body: '{"email":"test@example.com"}',
      },
    ])
  })

  it('treats empty inline JSON as invalid JSON instead of missing input', async () => {
    const result = await runCli(['verify', '--json', ''], {
      cwd,
      env: {
        ...process.env,
        FINDYMAIL_API_KEY: 'test-key',
      },
      stdin: '{"email":"should-not-be-read@example.com"}',
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

  it('treats an empty input path as a file lookup error', async () => {
    const result = await runCli(['verify', '--input', ''], {
      cwd,
      env: {
        ...process.env,
        FINDYMAIL_API_KEY: 'test-key',
      },
    })

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'usage',
        message: 'Input file not found: ',
      },
    })
  })
})

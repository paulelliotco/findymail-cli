import { afterEach, describe, expect, it } from 'vitest'

import { runCli } from '../helpers/cli'
import { startJsonServer } from '../helpers/server'

const cwd = '/Users/paul/CascadeProjects/contributions/findymail-cli'

const searchCases = [
  { name: 'name', path: '/api/search/name', body: '{"name":"Ada Lovelace","domain":"example.com"}' },
  { name: 'domain', path: '/api/search/domain', body: '{"domain":"example.com","roles":["CEO"]}' },
  { name: 'company', path: '/api/search/company', body: '{"domain":"example.com"}' },
  { name: 'employees', path: '/api/search/employees', body: '{"website":"example.com","job_titles":["CEO"],"count":1}' },
  { name: 'reverse-email', path: '/api/search/reverse-email', body: '{"email":"ada@example.com","with_profile":true}' },
  { name: 'phone', path: '/api/search/phone', body: '{"linkedin_url":"https://linkedin.com/in/ada"}' },
] as const

describe('search commands', () => {
  afterEach(() => {
    delete process.env.FINDYMAIL_API_KEY
    delete process.env.FINDYMAIL_BASE_URL
  })

  for (const testCase of searchCases) {
    it(`posts to ${testCase.path}`, async () => {
      const server = await startJsonServer(() => ({ body: { command: testCase.name } }))

      const result = await runCli(['search', testCase.name, '--json', testCase.body], {
        cwd,
        env: {
          ...process.env,
          FINDYMAIL_API_KEY: 'test-key',
          FINDYMAIL_BASE_URL: server.baseUrl,
        },
      })

      await server.close()

      expect(result.exitCode).toBe(0)
      expect(JSON.parse(result.stdout)).toEqual({ command: testCase.name })
      expect(server.requests).toEqual([
        {
          method: 'POST',
          url: testCase.path,
          auth: 'Bearer test-key',
          body: testCase.body,
        },
      ])
    })

    it(`returns structured usage errors for invalid JSON on ${testCase.name}`, async () => {
      const result = await runCli(['search', testCase.name, '--json', '{'], {
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
          message: 'Input is not valid JSON',
        },
      })
    })

    it(`returns structured API errors for ${testCase.name}`, async () => {
      const server = await startJsonServer(() => ({
        status: 422,
        body: { error: 'bad input' },
      }))

      const result = await runCli(['search', testCase.name, '--json', testCase.body], {
        cwd,
        env: {
          ...process.env,
          FINDYMAIL_API_KEY: 'test-key',
          FINDYMAIL_BASE_URL: server.baseUrl,
        },
      })

      await server.close()

      expect(result.exitCode).toBe(1)
      expect(JSON.parse(result.stderr)).toEqual({
        ok: false,
        error: {
          type: 'api',
          message: 'Findymail request failed with status 422',
          status: 422,
          endpoint: testCase.path,
          details: { error: 'bad input' },
        },
      })
    })
  }

  it('requires a subcommand for the search namespace', async () => {
    const result = await runCli(['search'], {
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
        message: 'Use a subcommand for search',
      },
    })
  })
})

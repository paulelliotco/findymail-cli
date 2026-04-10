import { afterEach, describe, expect, it } from 'vitest'

import { runCli } from '../helpers/cli'
import { startJsonServer } from '../helpers/server'

const cwd = '/Users/paul/CascadeProjects/contributions/findymail-cli'

describe('list and contact commands', () => {
  afterEach(() => {
    delete process.env.FINDYMAIL_API_KEY
    delete process.env.FINDYMAIL_BASE_URL
  })

  it('lists contact lists with GET /api/lists', async () => {
    const server = await startJsonServer(() => ({ body: [{ id: 1, name: 'Prospects' }] }))

    const result = await runCli(['lists', 'get'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual([{ id: 1, name: 'Prospects' }])
    expect(server.requests[0]).toEqual({
      method: 'GET',
      url: '/api/lists',
      auth: 'Bearer test-key',
      body: '',
    })
  })

  it('creates a contact list with POST /api/lists', async () => {
    const server = await startJsonServer(() => ({ body: { id: 2, name: 'VIPs' } }))

    const result = await runCli(['lists', 'create', '--json', '{"name":"VIPs"}'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({ id: 2, name: 'VIPs' })
    expect(server.requests[0]).toEqual({
      method: 'POST',
      url: '/api/lists',
      auth: 'Bearer test-key',
      body: '{"name":"VIPs"}',
    })
  })

  it('deletes a contact list with DELETE /api/lists/{id}', async () => {
    const server = await startJsonServer(() => ({ body: { deleted: true } }))

    const result = await runCli(['lists', 'delete', '--id', '42'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({ deleted: true })
    expect(server.requests[0]).toEqual({
      method: 'DELETE',
      url: '/api/lists/42',
      auth: 'Bearer test-key',
      body: '',
    })
  })

  it('fetches contacts with GET /api/contacts/get/{id}', async () => {
    const server = await startJsonServer(() => ({ body: [{ email: 'ada@example.com' }] }))

    const result = await runCli(['contacts', 'get', '--id', '0'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual([{ email: 'ada@example.com' }])
    expect(server.requests[0]).toEqual({
      method: 'GET',
      url: '/api/contacts/get/0',
      auth: 'Bearer test-key',
      body: '',
    })
  })

  it('returns structured usage errors when list delete id is missing', async () => {
    const result = await runCli(['lists', 'delete'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key' },
    })

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'usage',
        message: "required option '--id <id>' not specified",
      },
    })
  })

  it('returns structured API errors for list get', async () => {
    const server = await startJsonServer(() => ({ status: 500, body: { error: 'server exploded' } }))

    const result = await runCli(['lists', 'get'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'api',
        message: 'Findymail request failed with status 500',
        status: 500,
        endpoint: '/api/lists',
        details: { error: 'server exploded' },
      },
    })
  })

  it('returns structured API errors for contacts get', async () => {
    const server = await startJsonServer(() => ({ status: 404, body: { error: 'not found' } }))

    const result = await runCli(['contacts', 'get', '--id', '1'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key', FINDYMAIL_BASE_URL: server.baseUrl },
    })

    await server.close()

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'api',
        message: 'Findymail request failed with status 404',
        status: 404,
        endpoint: '/api/contacts/get/1',
        details: { error: 'not found' },
      },
    })
  })

  it('requires a subcommand for the lists namespace', async () => {
    const result = await runCli(['lists'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key' },
    })

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'usage',
        message: 'Use a subcommand for lists',
      },
    })
  })

  it('requires a subcommand for the contacts namespace', async () => {
    const result = await runCli(['contacts'], {
      cwd,
      env: { ...process.env, FINDYMAIL_API_KEY: 'test-key' },
    })

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        type: 'usage',
        message: 'Use a subcommand for contacts',
      },
    })
  })
})

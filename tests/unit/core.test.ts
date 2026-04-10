import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadRuntimeConfig } from '../../src/core/config.js'
import { CliError } from '../../src/core/errors.js'
import { loadJsonInput } from '../../src/core/input.js'
import { waitFor } from '../../src/core/polling.js'

describe('core helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads runtime config from env', () => {
    expect(loadRuntimeConfig({ FINDYMAIL_API_KEY: 'abc', FINDYMAIL_BASE_URL: 'http://localhost:1234' })).toEqual({
      apiKey: 'abc',
      baseUrl: 'http://localhost:1234',
      timeoutMs: 30000,
    })
  })

  it('throws a config error when the API key is missing', () => {
    expect(() => loadRuntimeConfig({})).toThrowError(new CliError({
      type: 'config',
      message: 'FINDYMAIL_API_KEY is not set',
      exitCode: 2,
    }))
  })

  it('loads JSON from a file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'findymail-cli-'))
    const path = join(directory, 'payload.json')
    await writeFile(path, '{"email":"ada@example.com"}', 'utf8')

    await expect(loadJsonInput({ input: path })).resolves.toEqual({ email: 'ada@example.com' })
  })

  it('rejects invalid input combinations', async () => {
    await expect(loadJsonInput({ json: '{}', stdin: true })).rejects.toMatchObject({
      type: 'usage',
      message: 'Provide exactly one of --json, --input, or --stdin',
    })
  })

  it('rejects stdin input when stdin is interactive', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')
    Object.defineProperty(process.stdin, 'isTTY', {
      configurable: true,
      value: true,
    })

    await expect(loadJsonInput({ stdin: true })).rejects.toMatchObject({
      type: 'usage',
      message: 'Refusing to read interactive stdin; pipe data or use --json/--input',
    })

    if (descriptor) {
      Object.defineProperty(process.stdin, 'isTTY', descriptor)
    } else {
      delete (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY
    }
  })

  it('rejects directory input paths', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'findymail-cli-'))
    const nestedDirectory = join(directory, 'payload-dir')
    await mkdir(nestedDirectory)

    await expect(loadJsonInput({ input: nestedDirectory })).rejects.toMatchObject({
      type: 'usage',
      message: `Input path is not a file: ${nestedDirectory}`,
    })
  })

  it('times out waiting for terminal polling state', async () => {
    await expect(waitFor({
      pollIntervalMs: 1,
      maxWaitMs: 5,
      isTerminal: () => false,
      load: async () => ({ status: 'running' }),
    })).rejects.toMatchObject({
      type: 'timeout',
      message: 'Timed out while waiting for Intellimatch to finish',
    })
  })

  it('does not accept a terminal result that arrives after the deadline', async () => {
    await expect(waitFor({
      pollIntervalMs: 1,
      maxWaitMs: 5,
      isTerminal: () => true,
      load: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { status: 'completed' }
      },
    })).rejects.toMatchObject({
      type: 'timeout',
      message: 'Timed out while waiting for Intellimatch to finish',
    })
  })

  it('ships the CLI entrypoint with a shebang for installed bin execution', async () => {
    const cliSource = await readFile(join(process.cwd(), 'src/cli.ts'), 'utf8')
    expect(cliSource.startsWith('#!/usr/bin/env node')).toBe(true)
  })
})

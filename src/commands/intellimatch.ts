import { Command } from 'commander'

import { CliError } from '../core/errors.js'
import { getJson } from '../core/http.js'
import { waitFor } from '../core/polling.js'
import { loadRuntimeConfig } from '../core/config.js'
import { createGetCommand, createPostBodyCommand } from './shared.js'

function getTerminalStatus(value: unknown, path: string): 'completed' | 'failed' | null {
  if (!value || typeof value !== 'object') {
    throw new CliError({
      type: 'api',
      message: 'Unexpected Intellimatch status payload',
      exitCode: 1,
      endpoint: path,
      details: value,
    })
  }

  const status = (value as { status?: unknown }).status
  if (typeof status !== 'string') {
    throw new CliError({
      type: 'api',
      message: 'Unexpected Intellimatch status payload',
      exitCode: 1,
      endpoint: path,
      details: value,
    })
  }

  const normalized = status.toLowerCase()
  if (['completed', 'done'].includes(normalized)) {
    return 'completed'
  }
  if (['failed', 'error'].includes(normalized)) {
    return 'failed'
  }

  return null
}

function parsePositiveInteger(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError({
      type: 'usage',
      message: '--poll-interval and --max-wait must be positive integers in milliseconds',
      exitCode: 2,
    })
  }

  return parsed
}

export function createIntellimatchCommand(): Command {
  const command = new Command('intellimatch')

  command.description('Run and inspect Intellimatch jobs')
  command.action(() => {
    throw new CliError({
      type: 'usage',
      message: 'Use a subcommand for intellimatch',
      exitCode: 2,
    })
  })

  const searchCommand = createPostBodyCommand({
    name: 'search',
    description: 'Start an Intellimatch search job',
    path: '/api/intellimatch/search',
    examples: [
      "findymail intellimatch search --json '{\"query\":\"SaaS companies in US\"}'",
      "findymail intellimatch search --json '{\"query\":\"SaaS companies in US\"}' --wait --poll-interval 1000 --max-wait 30000",
    ],
    onSuccess: async (response, options) => {
      if (!options.wait) {
        return response
      }

      const hash = typeof response === 'object' && response && 'hash' in response
        ? (response as { hash?: unknown }).hash
        : undefined
      if (typeof hash !== 'string' || hash.length === 0) {
        throw new CliError({
          type: 'api',
          message: 'Intellimatch search response did not include a usable hash',
          exitCode: 1,
          endpoint: '/api/intellimatch/search',
          details: response,
        })
      }

      const config = loadRuntimeConfig(process.env)
      const path = `/api/intellimatch/status?hash=${encodeURIComponent(hash)}`
      const pollIntervalMs = parsePositiveInteger(options.pollInterval)
      const maxWaitMs = parsePositiveInteger(options.maxWait)

      const finalPayload = await waitFor({
        pollIntervalMs,
        maxWaitMs,
        isTerminal: (value) => getTerminalStatus(value, path) !== null,
        load: async (remainingMs) => await getJson({
          ...config,
          timeoutMs: Math.min(config.timeoutMs, remainingMs),
          path,
        }),
      })

      const terminalStatus = getTerminalStatus(finalPayload, path)
      if (terminalStatus === 'failed') {
        throw new CliError({
          type: 'api',
          message: 'Intellimatch job failed',
          exitCode: 1,
          endpoint: path,
          details: finalPayload,
        })
      }

      return finalPayload
    },
  })
  searchCommand.option('--wait', 'Poll job status until completion')
  searchCommand.option('--poll-interval <ms>', 'Polling interval in milliseconds', '1000')
  searchCommand.option('--max-wait <ms>', 'Maximum wait time in milliseconds', '30000')
  searchCommand.hook('preAction', (_, actionCommand) => {
    const options = actionCommand.opts()
    if (!options.wait) {
      return
    }

    parsePositiveInteger(options.pollInterval)
    parsePositiveInteger(options.maxWait)
  })
  command.addCommand(searchCommand)

  const statusCommand = createGetCommand({
    name: 'status',
    description: 'Check Intellimatch job status',
    path: (options) => `/api/intellimatch/status?hash=${encodeURIComponent(options.hash as string)}`,
    examples: ['findymail intellimatch status --hash job-123'],
  })
  statusCommand.requiredOption('--hash <hash>', 'Intellimatch job hash')
  command.addCommand(statusCommand)

  return command
}

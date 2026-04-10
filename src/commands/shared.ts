import { Command } from 'commander'

import { loadRuntimeConfig } from '../core/config.js'
import { deleteJson, getJson, postJson } from '../core/http.js'
import { loadJsonInput } from '../core/input.js'
import { writeSuccess } from '../core/output.js'

export function addJsonInputOptions(command: Command): Command {
  return command
    .option('--json <json>', 'Inline JSON request body')
    .option('--input <path>', 'Read request JSON from a file')
    .option('--stdin', 'Read request JSON from stdin')
}

function configureAgentCommand(command: Command): Command {
  return command
    .showHelpAfterError(false)
    .configureOutput({
      writeErr: () => {},
    })
    .exitOverride()
}

export function createPostBodyCommand(options: {
  name: string
  description: string
  path: string
  examples: string[]
  onSuccess?: (data: unknown, commandOptions: Record<string, unknown>) => Promise<unknown> | unknown
}): Command {
  const command = configureAgentCommand(new Command(options.name))

  addJsonInputOptions(command)
    .description(options.description)
    .action(async (commandOptions) => {
      const config = loadRuntimeConfig(process.env)
      const body = await loadJsonInput(commandOptions)
      const response = await postJson({
        ...config,
        path: options.path,
        body,
      })
      const finalResponse = options.onSuccess
        ? await options.onSuccess(response, commandOptions as Record<string, unknown>)
        : response

      writeSuccess(finalResponse)
    })

  appendExamples(command, options.examples)
  return command
}

export function createGetCommand(options: {
  name: string
  description: string
  path: string | ((commandOptions: Record<string, unknown>) => string)
  examples: string[]
}): Command {
  const command = configureAgentCommand(new Command(options.name))

  command
    .description(options.description)
    .action(async (commandOptions) => {
      const config = loadRuntimeConfig(process.env)
      const path = typeof options.path === 'function'
        ? options.path(commandOptions as Record<string, unknown>)
        : options.path
      const response = await getJson({
        ...config,
        path,
      })

      writeSuccess(response)
    })

  appendExamples(command, options.examples)
  return command
}

export function createDeleteCommand(options: {
  name: string
  description: string
  path: (commandOptions: Record<string, unknown>) => string
  examples: string[]
}): Command {
  const command = configureAgentCommand(new Command(options.name))

  command
    .description(options.description)
    .action(async (commandOptions) => {
      const config = loadRuntimeConfig(process.env)
      const response = await deleteJson({
        ...config,
        path: options.path(commandOptions as Record<string, unknown>),
      })

      writeSuccess(response)
    })

  appendExamples(command, options.examples)
  return command
}

function appendExamples(command: Command, examples: string[]): void {
  command.addHelpText('after', `\nExamples:\n${examples.map((example) => `  $ ${example}`).join('\n')}\n`)
}

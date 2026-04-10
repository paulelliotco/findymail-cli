import { Command } from 'commander'

import { CliError } from '../core/errors.js'
import { createDeleteCommand, createGetCommand, createPostBodyCommand } from './shared.js'

export function createListsCommand(): Command {
  const command = new Command('lists')

  command.description('Manage Findymail lists')
  command.action(() => {
    throw new CliError({
      type: 'usage',
      message: 'Use a subcommand for lists',
      exitCode: 2,
    })
  })

  command.addCommand(createGetCommand({
    name: 'get',
    description: 'List all Findymail contact lists',
    path: '/api/lists',
    examples: ['findymail lists get'],
  }))

  command.addCommand(createPostBodyCommand({
    name: 'create',
    description: 'Create a Findymail contact list',
    path: '/api/lists',
    examples: ["findymail lists create --json '{\"name\":\"VIPs\"}'"],
  }))

  const deleteCommand = createDeleteCommand({
    name: 'delete',
    description: 'Delete a Findymail contact list',
    path: (options) => `/api/lists/${options.id as string}`,
    examples: ['findymail lists delete --id 42'],
  })
  deleteCommand.requiredOption('--id <id>', 'List identifier to delete')
  command.addCommand(deleteCommand)

  return command
}

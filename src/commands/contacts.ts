import { Command } from 'commander'

import { CliError } from '../core/errors.js'
import { createGetCommand } from './shared.js'

export function createContactsCommand(): Command {
  const command = new Command('contacts')

  command.description('Retrieve Findymail contacts')
  command.action(() => {
    throw new CliError({
      type: 'usage',
      message: 'Use a subcommand for contacts',
      exitCode: 2,
    })
  })

  const getCommand = createGetCommand({
    name: 'get',
    description: 'Fetch contacts by list id; use 0 for all contacts',
    path: (options) => `/api/contacts/get/${options.id as string}`,
    examples: ['findymail contacts get --id 0'],
  })
  getCommand.requiredOption('--id <id>', 'Contact list identifier')
  command.addCommand(getCommand)

  return command
}

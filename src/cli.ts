#!/usr/bin/env node

import { Command, CommanderError } from 'commander'

import { createContactsCommand } from './commands/contacts.js'
import { createIntellimatchCommand } from './commands/intellimatch.js'
import { createListsCommand } from './commands/lists.js'
import { createSearchCommand } from './commands/search.js'
import { createVerifyCommand } from './commands/verify.js'
import { CliError, toCliError } from './core/errors.js'
import { writeError } from './core/output.js'

async function main(argv: string[]): Promise<void> {
  const program = new Command()

  program
    .name('findymail')
    .description('Agent-friendly CLI for the Findymail API')
    .showHelpAfterError(false)
    .helpOption('-h, --help', 'Display help for a command')
    .configureOutput({
      writeErr: () => {},
    })
    .addCommand(createVerifyCommand())
    .addCommand(createSearchCommand())
    .addCommand(createIntellimatchCommand())
    .addCommand(createListsCommand())
    .addCommand(createContactsCommand())

  program.exitOverride()

  try {
    await program.parseAsync(argv, { from: 'user' })
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === 'commander.helpDisplayed') {
        process.exitCode = 0
        return
      }

      const message = error.message.replace(/^error:\s*/, '')

      throw new CliError({
        type: 'usage',
        message,
        exitCode: 2,
      })
    }

    throw error
  }
}

main(process.argv.slice(2)).catch((error) => {
  const cliError = toCliError(error)
  writeError(cliError)
  process.exitCode = cliError.exitCode
})

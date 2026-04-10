import { Command } from 'commander'

import { CliError } from '../core/errors.js'
import { createPostBodyCommand } from './shared.js'

export function createSearchCommand(): Command {
  const command = new Command('search')

  command.description('Search Findymail enrichment endpoints')
  command.action(() => {
    throw new CliError({
      type: 'usage',
      message: 'Use a subcommand for search',
      exitCode: 2,
    })
  })

  command.addCommand(createPostBodyCommand({
    name: 'business-profile',
    description: 'Find a work email from a LinkedIn profile URL',
    path: '/api/search/business-profile',
    examples: ["findymail search business-profile --json '{\"linkedin_url\":\"https://linkedin.com/in/ada\"}'"],
  }))
  command.addCommand(createPostBodyCommand({
    name: 'name',
    description: 'Find an email from a person name and company domain',
    path: '/api/search/name',
    examples: ["findymail search name --json '{\"name\":\"Ada Lovelace\",\"domain\":\"example.com\"}'"],
  }))
  command.addCommand(createPostBodyCommand({
    name: 'domain',
    description: 'Find contacts from a company domain and roles',
    path: '/api/search/domain',
    examples: ["findymail search domain --json '{\"domain\":\"example.com\",\"roles\":[\"CEO\"]}'"],
  }))
  command.addCommand(createPostBodyCommand({
    name: 'company',
    description: 'Enrich a company profile',
    path: '/api/search/company',
    examples: ["findymail search company --json '{\"domain\":\"example.com\"}'"],
  }))
  command.addCommand(createPostBodyCommand({
    name: 'employees',
    description: 'Find employees matching a website and title filters',
    path: '/api/search/employees',
    examples: ["findymail search employees --json '{\"website\":\"example.com\",\"job_titles\":[\"CEO\"],\"count\":1}'"],
  }))
  command.addCommand(createPostBodyCommand({
    name: 'reverse-email',
    description: 'Look up a profile from an email address',
    path: '/api/search/reverse-email',
    examples: ["findymail search reverse-email --json '{\"email\":\"ada@example.com\",\"with_profile\":true}'"],
  }))
  command.addCommand(createPostBodyCommand({
    name: 'phone',
    description: 'Find a phone number from a LinkedIn URL',
    path: '/api/search/phone',
    examples: ["findymail search phone --json '{\"linkedin_url\":\"https://linkedin.com/in/ada\"}'"],
  }))

  return command
}

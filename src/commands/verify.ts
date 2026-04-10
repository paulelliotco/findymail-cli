import { Command } from 'commander'

import { createPostBodyCommand } from './shared.js'

export function createVerifyCommand(): Command {
  return createPostBodyCommand({
    name: 'verify',
    description: 'Verify an email address with Findymail',
    path: '/api/verify',
    examples: [
      "findymail verify --json '{\"email\":\"name@company.com\"}'",
      'cat payload.json | findymail verify --stdin',
    ],
  })
}

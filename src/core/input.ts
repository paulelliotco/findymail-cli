import { readFile, stat } from 'node:fs/promises'

import { z } from 'zod'

import { CliError } from './errors.js'

const inputOptionsSchema = z.object({
  json: z.string().optional(),
  input: z.string().optional(),
  stdin: z.boolean().optional(),
})

export async function loadJsonInput(raw: unknown): Promise<unknown> {
  const options = inputOptionsSchema.parse(raw)
  const selected = [
    options.json !== undefined ? 'json' : null,
    options.input !== undefined ? 'input' : null,
    options.stdin ? 'stdin' : null,
  ].filter(Boolean)

  if (selected.length !== 1) {
    throw new CliError({
      type: 'usage',
      message: 'Provide exactly one of --json, --input, or --stdin',
      exitCode: 2,
    })
  }

  if (options.json !== undefined) {
    return parseJson(options.json)
  }

  if (options.input !== undefined) {
    if (options.input.length === 0) {
      throw new CliError({
        type: 'usage',
        message: 'Input file not found: ',
        exitCode: 2,
      })
    }

    try {
      const inputStat = await stat(options.input)
      if (!inputStat.isFile()) {
        throw new CliError({
          type: 'usage',
          message: `Input path is not a file: ${options.input}`,
          exitCode: 2,
        })
      }
    } catch (error) {
      if (error instanceof CliError) {
        throw error
      }
      throw new CliError({
        type: 'usage',
        message: `Input file not found: ${options.input}`,
        exitCode: 2,
      })
    }

    let content: string
    try {
      content = await readFile(options.input, 'utf8')
    } catch {
      throw new CliError({
        type: 'usage',
        message: `Unable to read input file: ${options.input}`,
        exitCode: 2,
      })
    }
    return parseJson(content)
  }

  const content = await readStdin()
  return parseJson(content)
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    throw new CliError({
      type: 'usage',
      message: 'Input is not valid JSON',
      exitCode: 2,
    })
  }
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new CliError({
      type: 'usage',
      message: 'Refusing to read interactive stdin; pipe data or use --json/--input',
      exitCode: 2,
    })
  }

  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}

import { spawn } from 'node:child_process'

export type CliResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export async function runCli(args: string[], options?: {
  cwd?: string
  env?: NodeJS.ProcessEnv
  stdin?: string
}): Promise<CliResult> {
  return await new Promise<CliResult>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', './src/cli.ts', ...args], {
      cwd: options?.cwd,
      env: options?.env,
      stdio: 'pipe',
    })

    const stdout: Buffer[] = []
    const stderr: Buffer[] = []

    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    })

    if (options?.stdin !== undefined) {
      child.stdin.write(options.stdin)
    }
    child.stdin.end()
  })
}

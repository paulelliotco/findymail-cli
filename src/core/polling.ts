import { CliError } from './errors.js'

type WaitOptions<T> = {
  pollIntervalMs: number
  maxWaitMs: number
  isTerminal: (value: T) => boolean
  load: (remainingMs: number) => Promise<T>
}

export async function waitFor<T>(options: WaitOptions<T>): Promise<T> {
  const deadline = Date.now() + options.maxWaitMs

  while (true) {
    const remainingMs = deadline - Date.now()
    if (remainingMs <= 0) {
      throw new CliError({
        type: 'timeout',
        message: 'Timed out while waiting for Intellimatch to finish',
        exitCode: 1,
      })
    }

    const result = await options.load(remainingMs)
    if (options.isTerminal(result)) {
      if (Date.now() > deadline) {
        throw new CliError({
          type: 'timeout',
          message: 'Timed out while waiting for Intellimatch to finish',
          exitCode: 1,
        })
      }

      return result
    }

    const remainingAfterLoadMs = deadline - Date.now()
    if (remainingAfterLoadMs <= 0) {
      throw new CliError({
        type: 'timeout',
        message: 'Timed out while waiting for Intellimatch to finish',
        exitCode: 1,
      })
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(options.pollIntervalMs, remainingAfterLoadMs)))
  }
}

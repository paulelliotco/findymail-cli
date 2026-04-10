import { createServer } from 'node:http'

export type RecordedRequest = {
  method?: string
  url?: string
  auth?: string
  body: string
}

export async function startJsonServer(responder: (request: RecordedRequest, index: number) => {
  status?: number
  headers?: Record<string, string>
  body?: unknown
}): Promise<{
  baseUrl: string
  requests: RecordedRequest[]
  close: () => Promise<void>
}> {
  const requests: RecordedRequest[] = []

  const server = createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) {
      body += chunk
    }

    const request = {
      method: req.method,
      url: req.url,
      auth: req.headers.authorization,
      body,
    }
    requests.push(request)

    const response = responder(request, requests.length - 1)

    res.writeHead(response.status ?? 200, {
      'content-type': 'application/json',
      ...(response.headers ?? {}),
    })
    res.end(JSON.stringify(response.body ?? { ok: true }))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    close: async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    },
  }
}

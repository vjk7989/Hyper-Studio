import http from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { providerJobInputSchema } from '../../shared/electron-api-schema'
import { bridgeModels, bridgeProfiles, providerJobBroker } from './main'

let server: http.Server | null = null
let token: string | null = null
let url: string | null = null

const send = (response: http.ServerResponse, status: number, body: unknown): void => {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(body))
}
const authorized = (header: string | undefined): boolean => {
  if (!token || !header?.startsWith('Bearer ')) return false
  const given = Buffer.from(header.slice(7))
  const expected = Buffer.from(token)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
const readBody = async (request: http.IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 256_000) throw new Error('Request body too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export async function startProviderJobBridge(): Promise<{ url: string; token: string }> {
  if (server && token && url) return { url, token }
  token = randomBytes(32).toString('hex')
  server = http.createServer(async (request, response) => {
    if (!authorized(request.headers.authorization)) return send(response, 401, { error: 'Unauthorized' })
    try {
      const route = new URL(request.url || '/', 'http://127.0.0.1')
      const match = /^\/jobs\/([a-f0-9-]+)(\/cancel)?$/.exec(route.pathname)
      if (request.method === 'POST' && route.pathname === '/jobs') return send(response, 202, await providerJobBroker.submit(providerJobInputSchema.parse(await readBody(request))))
      if (request.method === 'GET' && route.pathname === '/profiles') return send(response, 200, bridgeProfiles())
      if (request.method === 'GET' && route.pathname === '/models') return send(response, 200, bridgeModels(route.searchParams.get('profileId') || ''))
      if (match && request.method === 'GET' && !match[2]) {
        const job = providerJobBroker.get(match[1])
        return send(response, job ? 200 : 404, job ?? { error: 'Job not found' })
      }
      if (match && request.method === 'POST' && match[2]) {
        const job = providerJobBroker.cancel(match[1])
        return send(response, job ? 200 : 404, job ?? { error: 'Job not found' })
      }
      send(response, 404, { error: 'Not found' })
    } catch (error) { send(response, 400, { error: error instanceof Error ? error.message : 'Invalid request' }) }
  })
  try {
    await new Promise<void>((resolve, reject) => server!.once('error', reject).listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Cannot bind job bridge')
    url = `http://127.0.0.1:${address.port}`
    return { url, token }
  } catch (error) { server.close(); server = null; token = null; throw error }
}

export async function stopProviderJobBridge(): Promise<void> {
  const current = server
  server = null
  token = null
  url = null
  if (current) await new Promise<void>(resolve => current.close(() => resolve()))
}

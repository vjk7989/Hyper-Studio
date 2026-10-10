import dns from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { Readable } from 'node:stream'

export type ResolvedAddress = { address: string; family: 4 | 6 }
export type HostResolver = (hostname: string) => Promise<ResolvedAddress[]>

export const defaultHostResolver: HostResolver = async hostname => {
  const literal = net.isIP(hostname)
  if (literal) return [{ address: hostname, family: literal as 4 | 6 }]
  return (await dns.lookup(hostname, { all: true, verbatim: true })).map(({ address, family }) => ({ address, family: family as 4 | 6 }))
}

export function isLocalAddress(address: string): boolean {
  if (net.isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number)
    return a === 10 || a === 127 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31
  }
  if (net.isIP(address) === 6) return address === '::1' || /^(fc|fd|fe80)/i.test(address)
  return false
}

export function isPublicAddress(address: string): boolean {
  if (net.isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number)
    return a >= 1 && a <= 223 && !isLocalAddress(address) &&
      !(a === 169 && b === 254) && !(a === 100 && b >= 64 && b <= 127) &&
      !(a === 192 && b === 0) && !(a === 198 && (b === 18 || b === 19))
  }
  if (net.isIP(address) === 6) return /^[23][0-9a-f]*:/i.test(address)
  return false
}

export async function pinnedAddress(url: URL, allowLocal: boolean, resolver: HostResolver): Promise<ResolvedAddress> {
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = await resolver(hostname)
  if (!addresses.length || addresses.some(item => allowLocal ? !isLocalAddress(item.address) : !isPublicAddress(item.address))) {
    throw new Error('Output host resolves to a disallowed address')
  }
  return addresses[0]
}

/** Node's request lookup is pinned to the address we already validated, so DNS cannot change between check and connect. */
export async function pinnedFetch(url: URL, init: { signal: AbortSignal; headers?: HeadersInit }, address: ResolvedAddress): Promise<Response> {
  const requestModule = url.protocol === 'https:' ? https : http
  return new Promise<Response>((resolve, reject) => {
    const request = requestModule.request(url, {
      method: 'GET',
      headers: Object.fromEntries(new Headers(init.headers).entries()),
      signal: init.signal,
      autoSelectFamily: false,
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
    }, incoming => {
      const headers = new Headers()
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (Array.isArray(value)) for (const item of value) headers.append(name, item)
        else if (value !== undefined) headers.set(name, value)
      }
      resolve(new Response(Readable.toWeb(incoming) as ReadableStream<Uint8Array>, { status: incoming.statusCode ?? 500, headers }))
    })
    request.once('error', reject)
    request.end()
  })
}

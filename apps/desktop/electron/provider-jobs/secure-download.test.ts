import assert from 'node:assert/strict'
import http from 'node:http'
import { describe, it } from 'node:test'
import { pinnedAddress, pinnedFetch } from './secure-download.ts'

describe('pinned output transport', () => {
  it('rejects a DNS answer set containing a private address for a public output URL', async () => {
    await assert.rejects(pinnedAddress(new URL('https://media.example/video.mp4'), false, async () => [
      { address: '8.8.8.8', family: 4 }, { address: '10.0.0.5', family: 4 },
    ]), /disallowed address/)
  })

  it('connects to the checked address without resolving the hostname again', async () => {
    const server = http.createServer((_request, response) => { response.setHeader('content-type', 'video/mp4'); response.end('video') })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      assert.ok(address && typeof address !== 'string')
      const response = await pinnedFetch(new URL(`http://unresolvable.test:${address.port}/video.mp4`), { signal: new AbortController().signal }, { address: '127.0.0.1', family: 4 })
      assert.equal(response.status, 200)
      assert.equal(await response.text(), 'video')
    } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
  })
})

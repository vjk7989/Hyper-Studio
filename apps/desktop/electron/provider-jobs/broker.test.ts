import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { ProviderJobBroker } from './broker.ts'
import type { ProfileSnapshot, ProviderJob } from './types.ts'

const root = path.resolve('.local-tmp', 'provider-job-tests')
fs.mkdirSync(root, { recursive: true })
const folders: string[] = []
afterEach(() => { for (const folder of folders.splice(0)) fs.rmSync(folder, { recursive: true, force: true }) })

function fixture(fetcher: typeof fetch, limit = 2, resolveHost?: (hostname: string) => Promise<Array<{ address: string; family: 4 | 6 }>>) {
  const folder = fs.mkdtempSync(path.join(root, 'project-'))
  folders.push(folder)
  fs.mkdirSync(path.join(folder, 'outputs'))
  const profile: ProfileSnapshot = { id: 'p1', name: 'Custom', provider: 'custom', baseUrl: 'http://localhost:3000', apiKey: 'secret-one', custom: {
    submitPath: '/create', auth: { mode: 'bearer' }, requestFields: { prompt: 'prompt', model: 'model' }, response: { mode: 'direct', outputPath: 'video.url' },
  } }
  const profiles = new Map([['p1', profile]])
  const broker = new ProviderJobBroker({ profile: id => { const found = profiles.get(id); if (!found) throw new Error('Profile deleted'); return found }, projectFolder: id => { if (id !== 'project-1') throw new Error('Unknown project'); return folder },
    registerMedia: (_folder, relativePath) => ({ id: relativePath, relativePath, absolutePath: path.join(folder, relativePath), kind: 'video', origin: 'editor', createdAt: 1, updatedAt: 1, size: 5 }),
    fetch: fetcher, pollIntervalMs: 1, perProfileLimit: limit,
    resolveHost: resolveHost ?? (async hostname => [{ address: hostname === 'localhost' || hostname === '127.0.0.1' ? '127.0.0.1' : '8.8.8.8', family: 4 }]),
  })
  return { broker, folder, profile, profiles }
}

async function terminal(broker: ProviderJobBroker, id: string): Promise<ProviderJob> {
  const current = broker.get(id)
  if (current && ['succeeded', 'failed', 'cancelled'].includes(current.status)) return current
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { off(); reject(new Error('Timed out')) }, 2000)
    const off = broker.onChanged(job => { if (job.id === id && ['succeeded', 'failed', 'cancelled'].includes(job.status)) { clearTimeout(timeout); off(); resolve(job) } })
  })
}

describe('provider job broker', () => {
  it('blocks project removal while a job runs and prevents submissions until reopen', async () => {
    let finish!: () => void
    const held = new Promise<void>(resolve => { finish = resolve })
    const { broker } = fixture(async url => {
      if (String(url).endsWith('/create')) { await held; return Response.json({ video: { url: 'http://localhost:3000/output.mp4' } }) }
      return new Response(Buffer.from('video'), { status: 200 })
    })
    const input = { projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'sky' }
    const job = await broker.submit(input)
    assert.throws(() => broker.beginProjectRemoval('project-1'), /active generation jobs/)
    finish()
    assert.equal((await terminal(broker, job.id)).status, 'succeeded')
    const finishRemoval = broker.beginProjectRemoval('project-1')
    await assert.rejects(broker.submit(input), /Project is closing/)
    finishRemoval(true)
    await assert.rejects(broker.submit(input), /Project is closing/)
    broker.resumeProject('project-1')
    const second = await broker.submit(input)
    assert.equal((await terminal(broker, second.id)).status, 'succeeded')
  })
  it('saves generated output in registered project and snapshots profile keys', async () => {
    const requests: Array<{ url: string; auth?: string }> = []
    const { broker, folder, profile } = fixture(async (url, init) => {
      requests.push({ url: String(url), auth: new Headers(init?.headers).get('Authorization') ?? undefined })
      if (String(url).endsWith('/create')) return Response.json({ video: { url: 'http://localhost:3000/output.mp4' } })
      return new Response(Buffer.from('video'), { status: 200 })
    })
    const job = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'sky' })
    profile.apiKey = 'secret-two'
    const completed = await terminal(broker, job.id)
    assert.equal(completed.status, 'succeeded')
    assert.equal(completed.progress, 100)
    assert.equal(completed.outputs[0].relativePath.startsWith('outputs/'), true)
    assert.equal(fs.readFileSync(path.join(folder, completed.outputs[0].relativePath), 'utf8'), 'video')
    assert.equal(requests[0].auth, 'Bearer secret-one')
    assert.equal(requests[1].auth, undefined)
    assert.equal(JSON.stringify(completed).includes('secret-one'), false)
  })

  it('rejects unregistered project before any provider request', async () => {
    let calls = 0
    const { broker } = fixture(async () => { calls++; return Response.json({}) })
    await assert.rejects(broker.submit({ projectId: 'other', profileId: 'p1', modelId: 'movie', prompt: 'sky' }), /Unknown project/)
    assert.equal(calls, 0)
  })

  it('reports provider failure without leaking response body or key', async () => {
    const { broker } = fixture(async () => new Response('secret-one', { status: 401 }))
    const job = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'sky' })
    const failed = await terminal(broker, job.id)
    assert.equal(failed.status, 'failed')
    assert.match(failed.error ?? '', /HTTP 401/)
    assert.equal(JSON.stringify(failed).includes('secret-one'), false)
  })

  it('limits one profile while allowing cancellation of its queued job', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    let submits = 0
    const { broker } = fixture(async (url) => {
      if (String(url).endsWith('/create')) { submits++; await gate; return Response.json({ video: { url: 'http://localhost:3000/output.mp4' } }) }
      return new Response(Buffer.from('video'))
    }, 1)
    const first = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'one' })
    const second = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'two' })
    assert.equal(submits, 1)
    assert.equal(broker.get(second.id)?.status, 'queued')
    assert.equal(broker.cancel(second.id)?.status, 'cancelled')
    release()
    assert.equal((await terminal(broker, first.id)).status, 'succeeded')
    assert.equal(submits, 1)
  })

  it('runs different profiles concurrently after one profile is edited and deleted', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const authSeen: string[] = []
    const { broker, profile, profiles } = fixture(async (url, init) => {
      if (String(url).endsWith('/create')) {
        const auth = new Headers(init?.headers).get('Authorization') || ''
        authSeen.push(auth)
        if (auth === 'Bearer secret-one') await gate
        return Response.json({ video: { url: 'http://localhost:3000/output.mp4' } })
      }
      return new Response(Buffer.from('video'))
    }, 1)
    profiles.set('p2', { ...profile, id: 'p2', apiKey: 'secret-two' })
    const first = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'one' })
    profile.apiKey = 'changed-after-submit'
    profiles.delete('p1')
    const second = await broker.submit({ projectId: 'project-1', profileId: 'p2', modelId: 'movie', prompt: 'two' })
    assert.equal((await terminal(broker, second.id)).status, 'succeeded')
    assert.equal(broker.get(first.id)?.status, 'running')
    release()
    assert.equal((await terminal(broker, first.id)).status, 'succeeded')
    assert.deepEqual(authSeen.sort(), ['Bearer secret-one', 'Bearer secret-two'])
  })

  it('rejects public HTTP and redirects to private output URLs', async () => {
    const { broker } = fixture(async (url) => String(url).endsWith('/create')
      ? Response.json({ video: { url: 'http://public.example/video.mp4' } })
      : new Response(Buffer.from('video')))
    const first = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'one' })
    assert.equal((await terminal(broker, first.id)).status, 'failed')
    const redirected = fixture(async (url) => String(url).endsWith('/create')
      ? Response.json({ video: { url: 'https://public.example/video.mp4' } })
      : new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private.mp4' } }))
    redirected.profile.baseUrl = 'https://provider.example'
    const second = await redirected.broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'two' })
    assert.equal((await terminal(redirected.broker, second.id)).status, 'failed')
  })

  it('redacts transport errors containing query credentials', async () => {
    const { broker } = fixture(async () => { throw new Error('request to https://host.example/?api_key=secret-one failed') })
    const job = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'one' })
    const failed = await terminal(broker, job.id)
    assert.equal(failed.status, 'failed')
    assert.equal(JSON.stringify(failed).includes('secret-one'), false)
    assert.match(failed.error ?? '', /provider status/)
  })

  it('cancels an active request without changing it back to failed', async () => {
    const { broker } = fixture(async (_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    }))
    const job = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'one' })
    assert.equal(broker.cancel(job.id)?.status, 'cancelled')
    const cancelled = await terminal(broker, job.id)
    assert.equal(cancelled.status, 'cancelled')
    await new Promise(resolve => setTimeout(resolve, 1))
    assert.equal(broker.get(job.id)?.status, 'cancelled')
  })

  it('rejects a public output host whose DNS answers include a private address', async () => {
    let downloads = 0
    const { broker } = fixture(async url => {
      if (String(url).endsWith('/create')) return Response.json({ video: { url: 'https://public.example/video.mp4' } })
      downloads++
      return new Response(Buffer.from('video'))
    }, 2, async hostname => hostname === 'public.example'
      ? [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }]
      : [{ address: '127.0.0.1', family: 4 }])
    const job = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'one' })
    assert.equal((await terminal(broker, job.id)).status, 'failed')
    assert.equal(downloads, 0)
  })

  it('checks DNS again after each redirect and rejects a changed private answer', async () => {
    let resolutions = 0
    let downloads = 0
    const { broker } = fixture(async url => {
      if (String(url).endsWith('/create')) return Response.json({ video: { url: 'https://public.example/video.mp4' } })
      downloads++
      return new Response(null, { status: 302, headers: { location: 'https://public.example/next.mp4' } })
    }, 2, async hostname => {
      if (hostname === 'localhost') return [{ address: '127.0.0.1', family: 4 }]
      resolutions++
      return [{ address: resolutions === 1 ? '8.8.8.8' : '127.0.0.1', family: 4 }]
    })
    const job = await broker.submit({ projectId: 'project-1', profileId: 'p1', modelId: 'movie', prompt: 'one' })
    assert.equal((await terminal(broker, job.id)).status, 'failed')
    assert.equal(downloads, 1)
    assert.equal(resolutions, 2)
  })
})

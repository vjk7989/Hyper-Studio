import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { modelsForProfile, runProviderAdapter, UnsupportedProviderInputError } from './adapters.ts'
import type { ProfileSnapshot, ProviderJobInput } from './types.ts'

const input: ProviderJobInput = { projectId: 'one', profileId: 'profile', modelId: 'model', prompt: 'A bird flying' }
function context(handler: (url: string, init: RequestInit) => unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetcher = async (url: string | URL | Request, init: RequestInit = {}) => {
    const value = String(url)
    calls.push({ url: value, init })
    return Response.json(handler(value, init))
  }
  return { calls, context: { fetch: fetcher as typeof fetch, signal: new AbortController().signal, pollIntervalMs: 1, onProgress: () => {} } }
}
const profile = (provider: ProfileSnapshot['provider']): ProfileSnapshot => ({ id: 'profile', name: provider, provider, apiKey: 'key' })

describe('provider adapters', () => {
  it('LTX submits v2 job and polls result URL', async () => {
    const test = context(url => url.endsWith('/v2/text-to-video') ? { id: 'ltx-id' } : { status: 'completed', result: { video_url: 'https://media.example/video.mp4' } })
    const result = await runProviderAdapter(profile('ltx'), input, test.context)
    assert.deepEqual(result.urls, ['https://media.example/video.mp4'])
    assert.equal(JSON.parse(String(test.calls[0].init.body)).model, 'model')
    assert.equal(new Headers(test.calls[0].init.headers).get('Authorization'), 'Bearer key')
  })

  it('Runway submits image-to-video task and reads output array', async () => {
    const test = context(url => url.endsWith('/v1/image_to_video') ? { id: 'runway-id' } : { status: 'SUCCEEDED', output: ['https://media.example/video.mp4'] })
    const result = await runProviderAdapter(profile('runway'), input, test.context)
    assert.equal(result.urls[0], 'https://media.example/video.mp4')
    assert.equal(test.calls[0].url, 'https://api.dev.runwayml.com/v1/image_to_video')
    assert.equal(Object.hasOwn(JSON.parse(String(test.calls[0].init.body)), 'promptImage'), false)
    assert.equal(new Headers(test.calls[0].init.headers).get('X-Runway-Version'), '2024-11-06')
  })

  it('Veo uses current long-running operation and exposes only Google download auth', async () => {
    const test = context(url => url.includes(':predictLongRunning') ? { name: 'operations/op-1' } : { done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://generativelanguage.googleapis.com/video.mp4' } }] } } })
    const result = await runProviderAdapter(profile('veo'), { ...input, modelId: 'veo-3.1-generate-preview' }, test.context)
    assert.equal(result.urls[0], 'https://generativelanguage.googleapis.com/video.mp4')
    assert.equal(new Headers(result.downloadHeaders).get('x-goog-api-key'), 'key')
    assert.equal(new Headers(test.calls[0].init.headers).get('x-goog-api-key'), 'key')
    assert.equal(modelsForProfile(profile('veo'))[0].id, 'veo-3.1-generate-preview')
  })

  it('fal waits on queue status then reads result', async () => {
    const test = context(url => url.endsWith('/fal-ai/wan/v2.2-a14b/text-to-video') ? { request_id: 'fal-id' } : url.endsWith('/status') ? { status: 'COMPLETED' } : { video: { url: 'https://media.example/fal.mp4' } })
    const result = await runProviderAdapter(profile('fal'), { ...input, modelId: 'fal-ai/wan/v2.2-a14b/text-to-video' }, test.context)
    assert.deepEqual(result.urls, ['https://media.example/fal.mp4'])
    assert.equal(new Headers(test.calls[0].init.headers).get('Authorization'), 'Key key')
    assert.equal(modelsForProfile(profile('fal'))[0].id, 'fal-ai/wan/v2.2-a14b/text-to-video')
  })

  it('custom async maps request, poll, and output without crossing auth origin', async () => {
    const custom = profile('custom')
    custom.baseUrl = 'http://localhost:8123'
    custom.custom = { submitPath: '/generate', auth: { mode: 'header', name: 'X-Token' }, requestFields: { prompt: 'input.text', model: 'model' }, response: { mode: 'async', jobIdPath: 'task.id', pollPath: '/jobs/{jobId}', statusPath: 'state', outputPath: 'output.url' } }
    const test = context(url => url.endsWith('/generate') ? { task: { id: 'task-1' } } : { state: 'completed', output: { url: 'http://localhost:8123/video.mp4' } })
    const result = await runProviderAdapter(custom, input, test.context)
    assert.equal(result.urls[0], 'http://localhost:8123/video.mp4')
    assert.deepEqual(JSON.parse(String(test.calls[0].init.body)), { input: { text: input.prompt }, model: input.modelId })
    assert.equal(new Headers(test.calls[0].init.headers).get('X-Token'), 'key')
    custom.custom.submitPath = 'https://evil.example/generate'
    await assert.rejects(runProviderAdapter(custom, input, test.context), /configured origin/)
  })

  it('rejects local media and unsupported input kinds before submission', async () => {
    const test = context(() => ({}))
    await assert.rejects(runProviderAdapter(profile('ltx'), { ...input, inputs: { image: 'C:\\Project\\frame.png' } }, test.context), UnsupportedProviderInputError)
    await assert.rejects(runProviderAdapter(profile('runway'), { ...input, inputs: { video: 'https://example.com/source.mp4' } }, test.context), UnsupportedProviderInputError)
    await assert.rejects(runProviderAdapter(profile('fal'), { ...input, inputs: { lastImage: 'https://example.com/end.png' } }, test.context), UnsupportedProviderInputError)
    await assert.rejects(runProviderAdapter(profile('veo'), { ...input, inputs: { image: 'https://example.com/frame.png' } }, test.context), UnsupportedProviderInputError)
    assert.equal(test.calls.length, 0)
  })

  it('does not follow provider redirects with credentials', async () => {
    let calls = 0
    const fetcher = async (_url: string | URL | Request, init?: RequestInit) => {
      calls++
      assert.equal(init?.redirect, 'manual')
      return new Response(null, { status: 302, headers: { location: 'https://evil.example/steal' } })
    }
    await assert.rejects(runProviderAdapter(profile('ltx'), input, { fetch: fetcher as typeof fetch, signal: new AbortController().signal, pollIntervalMs: 1, onProgress: () => {} }), /redirect is not allowed/)
    assert.equal(calls, 1)
  })

  it('stops polling an unresponsive provider at the configured deadline', async () => {
    const test = context(url => url.endsWith('/v2/text-to-video') ? { id: 'job-1' } : { status: 'processing' })
    // Leave enough time for a poll even when the suite runs under heavy build load.
    await assert.rejects(runProviderAdapter(profile('ltx'), input, { ...test.context, maxPollMs: 250 }), /polling timed out/)
    assert.ok(test.calls.length > 1)
  })
})

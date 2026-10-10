import type { ProviderModel } from '../../shared/electron-api-schema'
import type { AdapterContext, ProfileSnapshot, ProviderJobInput } from './types'

type Json = Record<string, unknown>
export class UnsupportedProviderInputError extends Error {
  readonly code = 'UNSUPPORTED_PROVIDER_INPUT'
  constructor(message: string) { super(message); this.name = 'UnsupportedProviderInputError' }
}
const remoteMedia = (value: string, provider: string, allowData = false): string => {
  if (/^https:\/\//i.test(value) || (allowData && /^data:image\/(png|jpeg|webp);base64,/i.test(value))) return value
  throw new UnsupportedProviderInputError(`${provider} requires an HTTPS image URL${allowData ? ' or base64 image data URI' : ''}; local files need an upload step`)
}
const object = (value: unknown): Json => value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {}
const at = (value: unknown, path: string): unknown => path.split('.').filter(Boolean).reduce<unknown>((current, key) => {
  if (Array.isArray(current)) return current[Number(key)]
  return object(current)[key]
}, value)
const stringAt = (value: unknown, path: string): string | undefined => {
  const found = at(value, path)
  return typeof found === 'string' && found.length > 0 ? found : undefined
}
const outputUrls = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(outputUrls)
  const record = object(value)
  return typeof record.url === 'string' ? [record.url] : typeof record.uri === 'string' ? [record.uri] : []
}
const setPath = (target: Json, path: string, value: unknown): void => {
  const parts = path.split('.').filter(Boolean)
  if (!parts.length || parts.some(part => part === '__proto__' || part === 'constructor' || part === 'prototype')) throw new Error('Invalid custom field mapping')
  let current = target
  for (const part of parts.slice(0, -1)) current = current[part] = object(current[part])
  current[parts.at(-1)!] = value
}
const endpoint = (base: string, path: string): string => {
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Provider URL must be HTTP(S) without embedded credentials')
  return url.toString()
}
const sameOriginEndpoint = (base: string, path: string): string => {
  const result = endpoint(base, path)
  if (new URL(result).origin !== new URL(base).origin) throw new Error('Provider endpoint must stay on configured origin')
  return result
}
const safeId = (id: string): string => encodeURIComponent(id)
const pause = async (ms: number, signal: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
  if (signal.aborted) return reject(signal.reason)
  const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
  const abort = () => { clearTimeout(timer); reject(signal.reason) }
  signal.addEventListener('abort', abort, { once: true })
})
async function jsonRequest(ctx: AdapterContext, url: string, init: RequestInit): Promise<Json> {
  const response = await ctx.fetch(url, { ...init, signal: ctx.signal, redirect: 'manual' })
  if (response.status >= 300 && response.status < 400) throw new Error('Provider redirect is not allowed')
  if (!response.ok) throw new Error(`Provider request failed (HTTP ${response.status})`)
  return object(await response.json())
}
async function poll(ctx: AdapterContext, url: () => string, headers: HeadersInit, interpret: (value: Json) => { state: 'running' | 'succeeded' | 'failed'; progress?: number; urls?: string[] }): Promise<string[]> {
  const deadline = Date.now() + (ctx.maxPollMs ?? 3_600_000)
  for (;;) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new Error('Provider polling timed out')
    await pause(Math.min(ctx.pollIntervalMs, remaining), ctx.signal)
    if (Date.now() >= deadline) throw new Error('Provider polling timed out')
    const state = interpret(await jsonRequest(ctx, url(), { headers }))
    if (state.progress !== undefined) ctx.onProgress(Math.max(0, Math.min(99, state.progress)))
    if (state.state === 'failed') throw new Error('Provider generation failed')
    if (state.state === 'succeeded') {
      if (!state.urls?.length) throw new Error('Provider completed without a video URL')
      return state.urls
    }
  }
}

export async function runProviderAdapter(profile: ProfileSnapshot, input: ProviderJobInput, ctx: AdapterContext): Promise<{ urls: string[]; downloadHeaders?: HeadersInit }> {
  if (input.inputs?.video) throw new UnsupportedProviderInputError(`${profile.provider} video input is not supported by this adapter`)
  if (input.inputs?.lastImage && !['ltx', 'veo'].includes(profile.provider)) throw new UnsupportedProviderInputError(`${profile.provider} last-frame input is not supported by this adapter`)
  if (profile.provider === 'custom' && input.inputs?.lastImage) throw new UnsupportedProviderInputError('Custom mapping has no last-frame input field')
  const key = profile.apiKey
  if (profile.provider !== 'custom' && !key) throw new Error('Provider API key is missing')
  const options = input.options ?? {}
  if (profile.provider === 'ltx') {
    if (input.inputs?.lastImage && !input.inputs.image) throw new UnsupportedProviderInputError('LTX last-frame input also requires a starting image')
    const base = profile.baseUrl ?? 'https://api.ltx.io'
    const route = input.inputs?.image ? 'image-to-video' : 'text-to-video'
    const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
    const payload: Json = { prompt: input.prompt, model: input.modelId, duration: options.duration ?? 8, resolution: options.resolution ?? '1920x1080' }
    if (input.inputs?.image) payload.image_uri = remoteMedia(input.inputs.image, 'LTX', true)
    if (input.inputs?.lastImage) payload.last_frame_uri = remoteMedia(input.inputs.lastImage, 'LTX', true)
    const submitted = await jsonRequest(ctx, endpoint(base, `/v2/${route}`), { method: 'POST', headers, body: JSON.stringify(payload) })
    const id = stringAt(submitted, 'id')
    if (!id) throw new Error('LTX did not return a job ID')
    return { urls: await poll(ctx, () => endpoint(base, `/v2/${route}/${safeId(id)}`), headers, value => {
      const status = stringAt(value, 'status')?.toLowerCase()
      return { state: status === 'completed' ? 'succeeded' : ['failed', 'canceled', 'cancelled'].includes(status ?? '') ? 'failed' : 'running', urls: outputUrls(at(value, 'result.video_url')), progress: Number(at(value, 'progress')) || undefined }
    }) }
  }
  if (profile.provider === 'runway') {
    const base = profile.baseUrl ?? 'https://api.dev.runwayml.com'
    const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Runway-Version': '2024-11-06' }
    const payload: Json = { model: input.modelId, promptText: input.prompt, ratio: options.ratio ?? '1280:720', duration: options.duration ?? 5 }
    if (input.inputs?.image) payload.promptImage = remoteMedia(input.inputs.image, 'Runway', true)
    const submitted = await jsonRequest(ctx, endpoint(base, '/v1/image_to_video'), { method: 'POST', headers, body: JSON.stringify(payload) })
    const id = stringAt(submitted, 'id')
    if (!id) throw new Error('Runway did not return a task ID')
    return { urls: await poll(ctx, () => endpoint(base, `/v1/tasks/${safeId(id)}`), headers, value => {
      const status = stringAt(value, 'status')?.toUpperCase()
      return { state: status === 'SUCCEEDED' ? 'succeeded' : ['FAILED', 'CANCELLED', 'ABORTED'].includes(status ?? '') ? 'failed' : 'running', urls: outputUrls(value.output) }
    }) }
  }
  if (profile.provider === 'veo') {
    const base = profile.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
    const headers = { 'x-goog-api-key': key!, 'Content-Type': 'application/json' }
    const instance: Json = { prompt: input.prompt }
    if (input.inputs?.image) {
      const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(input.inputs.image)
      if (!match) throw new UnsupportedProviderInputError('Veo image input requires a base64 image data URI')
      instance.image = { inlineData: { mimeType: match[1], data: match[2] } }
    }
    if (input.inputs?.lastImage) {
      if (!input.inputs.image) throw new UnsupportedProviderInputError('Veo last-frame input also requires a starting image')
      const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(input.inputs.lastImage)
      if (!match) throw new UnsupportedProviderInputError('Veo last-frame input requires a base64 image data URI')
      instance.lastFrame = { inlineData: { mimeType: match[1], data: match[2] } }
    }
    const submitted = await jsonRequest(ctx, endpoint(base, `models/${safeId(input.modelId)}:predictLongRunning`), { method: 'POST', headers, body: JSON.stringify({ instances: [instance], parameters: options }) })
    const operation = stringAt(submitted, 'name')
    if (!operation || !/^operations\/[\w-]+$/.test(operation)) throw new Error('Veo did not return a valid operation name')
    const urls = await poll(ctx, () => endpoint(base, operation), headers, value => ({ state: value.done === true ? value.error ? 'failed' : 'succeeded' : 'running', urls: outputUrls(at(value, 'response.generateVideoResponse.generatedSamples.0.video.uri')) }))
    return { urls, downloadHeaders: { 'x-goog-api-key': key! } }
  }
  if (profile.provider === 'fal') {
    const base = profile.baseUrl ?? 'https://queue.fal.run'
    const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' }
    const model = input.modelId.replace(/^\/+/, '')
    if (!/^[\w-]+\/[\w./-]+$/.test(model) || model.includes('..')) throw new Error('Invalid fal model ID')
    const payload: Json = { prompt: input.prompt, ...options }
    if (input.inputs?.image) payload.image_url = remoteMedia(input.inputs.image, 'fal.ai')
    const submitted = await jsonRequest(ctx, endpoint(base, model), { method: 'POST', headers, body: JSON.stringify(payload) })
    const requestId = stringAt(submitted, 'request_id')
    if (!requestId) throw new Error('fal did not return a request ID')
    const statusUrl = sameOriginEndpoint(base, stringAt(submitted, 'status_url') ?? `${model}/requests/${safeId(requestId)}/status`)
    const responseUrl = sameOriginEndpoint(base, stringAt(submitted, 'response_url') ?? `${model}/requests/${safeId(requestId)}`)
    await poll(ctx, () => statusUrl, headers, value => {
      const status = stringAt(value, 'status')?.toUpperCase()
      return { state: status === 'COMPLETED' ? 'succeeded' : status === 'FAILED' ? 'failed' : 'running', urls: ['pending-result'], progress: Number(at(value, 'progress')) || undefined }
    })
    const result = await jsonRequest(ctx, responseUrl, { headers })
    const urls = outputUrls(result.video).concat(outputUrls(result.videos))
    if (!urls.length) throw new Error('fal completed without a video URL')
    return { urls }
  }
  const mapping = profile.custom
  if (!mapping || !profile.baseUrl) throw new Error('Custom profile requires a URL and mapping')
  if (input.inputs?.image && !mapping.requestFields.inputImage) throw new UnsupportedProviderInputError('Custom mapping has no image input field')
  const url = new URL(sameOriginEndpoint(profile.baseUrl, mapping.submitPath))
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key && mapping.auth.mode === 'bearer') headers.Authorization = `Bearer ${key}`
  if (key && mapping.auth.mode === 'header') headers[mapping.auth.name || 'X-API-Key'] = key
  if (key && mapping.auth.mode === 'query') url.searchParams.set(mapping.auth.name || 'api_key', key)
  const payload: Json = {}
  setPath(payload, mapping.requestFields.prompt, input.prompt)
  setPath(payload, mapping.requestFields.model, input.modelId)
  if (input.inputs?.image && mapping.requestFields.inputImage) setPath(payload, mapping.requestFields.inputImage, input.inputs.image)
  if (mapping.requestFields.options) setPath(payload, mapping.requestFields.options, options)
  const submitted = await jsonRequest(ctx, url.toString(), { method: 'POST', headers, body: JSON.stringify(payload) })
  if (mapping.response.mode === 'direct') {
    const urls = outputUrls(at(submitted, mapping.response.outputPath))
    if (!urls.length) throw new Error('Custom provider did not return an output URL')
    return { urls }
  }
  const id = stringAt(submitted, mapping.response.jobIdPath || '')
  if (!id || !mapping.response.pollPath || !mapping.response.statusPath) throw new Error('Custom async mapping is incomplete')
  const complete = mapping.response.completeValues ?? ['completed', 'succeeded', 'success']
  const failure = mapping.response.failureValues ?? ['failed', 'error', 'cancelled']
  return { urls: await poll(ctx, () => {
    const pollUrl = new URL(sameOriginEndpoint(profile.baseUrl!, mapping.response.pollPath!.replace('{jobId}', safeId(id))))
    if (key && mapping.auth.mode === 'query') pollUrl.searchParams.set(mapping.auth.name || 'api_key', key)
    return pollUrl.toString()
  }, headers, value => {
    const status = stringAt(value, mapping.response.statusPath!)?.toLowerCase()
    return { state: complete.some(v => v.toLowerCase() === status) ? 'succeeded' : failure.some(v => v.toLowerCase() === status) ? 'failed' : 'running', progress: Number(at(value, mapping.response.progressPath || '')) || undefined, urls: outputUrls(at(value, mapping.response.outputPath)) }
  }) }
}

export function modelsForProfile(profile: ProfileSnapshot): ProviderModel[] {
  const ids = profile.provider === 'ltx' ? ['ltx-2-5-pro', 'ltx-2-5-fast', 'ltx-2-3-pro', 'ltx-2-3-fast']
    : profile.provider === 'runway' ? ['gen4.5']
    : profile.provider === 'veo' ? ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview', 'veo-3.1-lite-generate-preview']
    : profile.provider === 'fal' ? ['fal-ai/wan/v2.2-a14b/text-to-video', 'fal-ai/minimax-video/image-to-video']
    : profile.defaultModelId ? [profile.defaultModelId] : []
  return ids.map(id => ({ id, label: id, provider: profile.provider }))
}

export async function testProfileConnection(profile: ProfileSnapshot): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  try {
    if (profile.provider === 'custom') endpoint(profile.baseUrl || '', profile.custom?.submitPath || '')
    else if (!profile.apiKey) throw new Error('API key is missing')
    return { ok: true, message: 'Profile configuration is valid; generation access is verified by a job.' }
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Invalid profile' } }
}

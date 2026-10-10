import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { WorkspaceMediaEntry } from '../../shared/electron-api-schema'
import { runProviderAdapter } from './adapters.ts'
import { UnsupportedProviderInputError } from './adapters.ts'
import { defaultHostResolver, pinnedAddress, pinnedFetch, type HostResolver } from './secure-download.ts'
import type { ProfileSnapshot, ProviderJob, ProviderJobInput } from './types'

export type BrokerDependencies = {
  profile: (profileId: string) => ProfileSnapshot | Promise<ProfileSnapshot>
  projectFolder: (projectId: string) => string
  registerMedia: (folder: string, relativePath: string) => WorkspaceMediaEntry
  fetch?: typeof fetch
  pollIntervalMs?: number
  maxPollMs?: number
  perProfileLimit?: number
  resolveHost?: HostResolver
}

export class ProviderJobBroker {
  private readonly deps: BrokerDependencies
  private readonly jobs = new Map<string, ProviderJob>()
  private readonly waiting = new Map<string, Array<{ job: ProviderJob; input: ProviderJobInput; profile: ProfileSnapshot }>>()
  private readonly active = new Map<string, number>()
  private readonly controllers = new Map<string, AbortController>()
  private readonly events = new EventEmitter()
  private readonly limit: number

  constructor(deps: BrokerDependencies) {
    this.deps = deps
    this.limit = Math.max(1, deps.perProfileLimit ?? 2)
  }

  onChanged(listener: (job: ProviderJob) => void): () => void {
    this.events.on('changed', listener)
    return () => this.events.off('changed', listener)
  }

  private emit(job: ProviderJob): void {
    job.updatedAt = Date.now()
    this.events.emit('changed', structuredClone(job))
  }

  async submit(input: ProviderJobInput): Promise<ProviderJob> {
    if (!input.prompt.trim() || !input.modelId.trim()) throw new Error('Prompt and model are required')
    this.deps.projectFolder(input.projectId) // Verify trusted registry before queueing.
    const profile = structuredClone(await this.deps.profile(input.profileId))
    if (profile.id !== input.profileId) throw new Error('Profile ID mismatch')
    const now = Date.now()
    const job: ProviderJob = { id: randomUUID(), projectId: input.projectId, profileId: input.profileId, modelId: input.modelId, status: 'queued', progress: 0, outputs: [], createdAt: now, updatedAt: now }
    this.jobs.set(job.id, job)
    const queue = this.waiting.get(profile.id) ?? []
    queue.push({ job, input: structuredClone(input), profile })
    this.waiting.set(profile.id, queue)
    this.emit(job)
    this.pump(profile.id)
    return structuredClone(job)
  }

  get(jobId: string): ProviderJob | null { const job = this.jobs.get(jobId); return job ? structuredClone(job) : null }

  cancel(jobId: string): ProviderJob | null {
    const job = this.jobs.get(jobId)
    if (!job) return null
    if (job.status === 'queued') {
      const queue = this.waiting.get(job.profileId)
      if (queue) this.waiting.set(job.profileId, queue.filter(item => item.job.id !== jobId))
      job.status = 'cancelled'
      this.emit(job)
    } else if (job.status === 'running') {
      this.controllers.get(jobId)?.abort(new Error('Job cancelled'))
      job.status = 'cancelled'
      this.emit(job)
    }
    return structuredClone(job)
  }

  private pump(profileId: string): void {
    const queue = this.waiting.get(profileId)
    if (!queue) return
    while ((this.active.get(profileId) ?? 0) < this.limit && queue.length) {
      const item = queue.shift()!
      this.active.set(profileId, (this.active.get(profileId) ?? 0) + 1)
      void this.run(item).finally(() => {
        this.active.set(profileId, (this.active.get(profileId) ?? 1) - 1)
        this.pump(profileId)
      })
    }
  }

  private async run(item: { job: ProviderJob; input: ProviderJobInput; profile: ProfileSnapshot }): Promise<void> {
    const { job, input, profile } = item
    const controller = new AbortController()
    this.controllers.set(job.id, controller)
    job.status = 'running'
    this.emit(job)
    try {
      const result = await runProviderAdapter(profile, input, {
        fetch: this.deps.fetch ?? fetch,
        signal: controller.signal,
        pollIntervalMs: this.deps.pollIntervalMs ?? 5000,
        maxPollMs: this.deps.maxPollMs ?? 3_600_000,
        onProgress: value => { if (job.status === 'running') { job.progress = value; this.emit(job) } },
      })
      if (controller.signal.aborted) return
      const folder = this.deps.projectFolder(job.projectId)
      for (let index = 0; index < result.urls.length; index++) {
        const media = await this.download(result.urls[index], folder, job.id, index, controller.signal, profile, result.downloadHeaders)
        if (controller.signal.aborted) return
        job.outputs.push(this.deps.registerMedia(folder, media))
        this.emit(job)
      }
      job.progress = 100
      job.status = 'succeeded'
      this.emit(job)
    } catch (error) {
      if (job.status !== 'cancelled') {
        job.status = 'failed'
        const message = error instanceof Error ? error.message : ''
        job.error = error instanceof UnsupportedProviderInputError ? message
          : /^(Provider request failed|Output download failed) \(HTTP \d{3}\)$/.test(message) ? message
          : message === 'Provider polling timed out' ? message
          : 'Provider job failed. Check profile configuration and provider status.'
        this.emit(job)
      }
    } finally { this.controllers.delete(job.id) }
  }

  private async download(source: string, folder: string, jobId: string, index: number, signal: AbortSignal, profile: ProfileSnapshot, headers?: HeadersInit): Promise<string> {
    const localHost = (hostname: string): boolean => {
      const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()
      if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '::1') return true
      if (net.isIP(host) === 4) {
        const parts = host.split('.').map(Number)
        return parts[0] === 10 || parts[0] === 127 || parts[0] === 192 && parts[1] === 168 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31
      }
      return net.isIP(host) === 6 && (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80'))
    }
    const customLocal = profile.provider === 'custom' && profile.baseUrl && (() => { const base = new URL(profile.baseUrl); return base.protocol === 'http:' && localHost(base.hostname) })()
    const initial = new URL(source)
    const startedLocal = localHost(initial.hostname)
    const validate = (candidate: URL): void => {
      if (candidate.username || candidate.password) throw new Error('Invalid provider output URL')
      if (candidate.protocol === 'https:') {
        if (localHost(candidate.hostname) && !(customLocal && startedLocal)) throw new Error('Private output URL is not allowed')
      } else if (candidate.protocol !== 'http:' || !customLocal || !startedLocal || !localHost(candidate.hostname)) throw new Error('Output URL must use HTTPS or configured local Custom HTTP')
    }
    let url = initial
    validate(url)
    const fileName = path.extname(url.pathname).toLowerCase()
    const extension = ['.mp4', '.mov', '.webm', '.mkv'].includes(fileName) ? fileName : '.mp4'
    const relative = `outputs/${jobId}-${index + 1}${extension}`
    const target = path.join(folder, 'outputs', `${jobId}-${index + 1}${extension}`)
    const temp = `${target}.partial`
    const canonicalRoot = fs.realpathSync(folder)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    if (fs.realpathSync(path.dirname(target)) !== path.join(canonicalRoot, 'outputs')) throw new Error('Project outputs folder is redirected')
    try {
      let response: Response | undefined
      for (let redirect = 0; redirect <= 3; redirect++) {
        const safeHeaders = url.origin === 'https://generativelanguage.googleapis.com' ? headers : undefined
        const address = await pinnedAddress(url, Boolean(customLocal && startedLocal), this.deps.resolveHost ?? defaultHostResolver)
        response = this.deps.fetch
          ? await this.deps.fetch(url.toString(), { signal, headers: safeHeaders, redirect: 'manual' })
          : await pinnedFetch(url, { signal, headers: safeHeaders }, address)
        if (![301, 302, 303, 307, 308].includes(response.status)) break
        const location = response.headers.get('location')
        if (!location || redirect === 3) throw new Error('Invalid output redirect')
        url = new URL(location, url)
        validate(url)
      }
      if (!response) throw new Error('Output download failed')
      if (!response.ok || !response.body) throw new Error(`Output download failed (HTTP ${response.status})`)
      const file = fs.openSync(temp, 'wx')
      try {
        const reader = response.body.getReader()
        let size = 0
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > 2_000_000_000) { await reader.cancel(); throw new Error('Output exceeds 2 GB limit') }
          for (let offset = 0; offset < value.byteLength;) offset += fs.writeSync(file, value, offset)
        }
      } finally { fs.closeSync(file) }
      fs.renameSync(temp, target)
      return relative
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp) }
  }
}

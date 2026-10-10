import type { CustomHttpMapping, ProviderKind, WorkspaceMediaEntry } from '../../shared/electron-api-schema'

export type ProfileSnapshot = {
  id: string
  name: string
  provider: ProviderKind
  baseUrl?: string
  apiKey?: string
  defaultModelId?: string
  custom?: CustomHttpMapping
}

export type ProviderJobInput = {
  projectId: string
  profileId: string
  modelId: string
  prompt: string
  inputs?: { image?: string; lastImage?: string; video?: string }
  options?: Record<string, unknown>
}

export type ProviderJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type ProviderJob = {
  id: string
  projectId: string
  profileId: string
  modelId: string
  status: ProviderJobStatus
  progress: number
  outputs: WorkspaceMediaEntry[]
  error?: string
  createdAt: number
  updatedAt: number
}

export type AdapterContext = {
  fetch: typeof fetch
  signal: AbortSignal
  pollIntervalMs: number
  maxPollMs?: number
  onProgress: (progress: number) => void
}

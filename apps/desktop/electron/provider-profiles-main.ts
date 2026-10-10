import { safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getLegacyAppDataDir } from './app-paths'
import { getSharedStorageRoot } from './project-registry'
import { ProviderProfileStore, type ProfileSnapshot } from './provider-profiles'

let current: { file: string; store: ProviderProfileStore } | null = null

function osStorageAvailable(): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false
  return process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text'
}

export function getProviderProfileStore(): ProviderProfileStore {
  const root = getSharedStorageRoot()
  if (!root) throw new Error('Choose a shared storage folder before configuring providers')
  const file = path.join(root, 'settings', 'provider-profiles.json')
  if (current?.file !== file) {
    current?.store.lock()
    current = { file, store: new ProviderProfileStore(file, {
      available: osStorageAvailable,
      encrypt: (value) => {
        if (!osStorageAvailable()) throw new Error('OS credential store is unavailable')
        return safeStorage.encryptString(value).toString('base64')
      },
      decrypt: (value) => {
        if (!osStorageAvailable()) throw new Error('OS credential store is unavailable')
        return safeStorage.decryptString(Buffer.from(value, 'base64'))
      },
    }) }
  }
  return current.store
}

/** Main-process only. Never send this snapshot through IPC or log it. */
export function getProfileSnapshot(profileId: string): ProfileSnapshot {
  return getProviderProfileStore().snapshot(profileId)
}

export function importLegacyProviderKeys(): string[] {
  const settingsPath = path.join(getLegacyAppDataDir(), 'settings.json')
  if (!fs.existsSync(settingsPath)) return []
  const legacy = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
  const store = getProviderProfileStore()
  const imported: string[] = []
  const candidates = [
    { field: 'ltx_api_key', name: 'Imported LTX', provider: 'ltx' as const },
    { field: 'fal_api_key', name: 'Imported fal.ai', provider: 'fal' as const },
    { field: 'gemini_api_key', name: 'Imported Google Veo', provider: 'veo' as const },
  ]
  for (const candidate of candidates) {
    const key = legacy[candidate.field]
    if (typeof key !== 'string' || !key.trim()) continue
    if (store.list().some(profile => profile.name === candidate.name && profile.provider === candidate.provider)) continue
    store.upsert({ name: candidate.name, provider: candidate.provider, apiKey: key.trim() })
    imported.push(candidate.name)
  }
  return imported
}

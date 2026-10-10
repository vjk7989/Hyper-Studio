import { useCallback, useEffect, useState } from 'react'
import type { ProviderModel, ProviderProfileMetadata } from '../../shared/electron-api-schema'

export function useProviderProfiles() {
  const [profiles, setProfiles] = useState<ProviderProfileMetadata[]>([])
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    try {
      setProfiles(await window.electronAPI.listProviderProfiles())
      setError(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }, [])
  useEffect(() => {
    void refresh()
    window.addEventListener('hyper-studio-profiles-changed', refresh)
    return () => window.removeEventListener('hyper-studio-profiles-changed', refresh)
  }, [refresh])
  return { profiles, error, refresh }
}

export function useProviderModels(profileId: string | null) {
  const [models, setModels] = useState<ProviderModel[]>([])
  useEffect(() => {
    if (!profileId) { setModels([]); return }
    let disposed = false
    void window.electronAPI.listProviderModels({ profileId })
      .then(items => { if (!disposed) setModels(items) })
      .catch(() => { if (!disposed) setModels([]) })
    return () => { disposed = true }
  }, [profileId])
  return models
}

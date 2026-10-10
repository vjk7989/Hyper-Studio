import type { components } from '@/types/comfyRegistryTypes'

type NodePack = components['schemas']['Node']

export type LocalManagerPack = NodePack & {
  hyperStudioLocalCatalog: true
  hyperStudioManagerPackId: string
}

/** Use only bundled manager metadata; no upstream account or registry request. */
export function localManagerPacksForIds(data: unknown, ids: string[]): LocalManagerPack[] {
  if (!data || typeof data !== 'object' || !('node_packs' in data)) return []
  const catalog = data.node_packs
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) return []

  const records = Object.entries(catalog as Record<string, unknown>)
  return ids.flatMap((id) => {
    const match = records.find(([key, value]) =>
      key === id || (value && typeof value === 'object' && 'id' in value && value.id === id)
    )
    if (!match) return []
    const [managerId, raw] = match
    if (!raw || typeof raw !== 'object') return []
    const pack = raw as Record<string, unknown>
    const repository = [pack.repository, pack.reference, Array.isArray(pack.files) ? pack.files[0] : null]
      .find((value): value is string => typeof value === 'string' && /^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?$/i.test(value))
    if (!repository) return []

    return [{
      id,
      name: typeof pack.title === 'string' && pack.title.trim() ? pack.title : id,
      repository,
      publisher: { name: 'Unclaimed' },
      latest_version: { version: 'nightly' },
      hyperStudioLocalCatalog: true,
      hyperStudioManagerPackId: managerId
    } as LocalManagerPack]
  })
}

import { beforeEach, expect, it, vi } from 'vitest'

import { api } from '@/scripts/api'
import { useRegistrySearchGateway } from './registrySearchGateway'
import { useAlgoliaSearchProvider } from '@/services/providers/algoliaSearchProvider'
import { useComfyRegistrySearchProvider } from '@/services/providers/registrySearchProvider'

vi.mock('@/platform/distribution/hyperStudio', () => ({ isHyperStudioEmbedded: true }))
vi.mock('@/scripts/api', () => ({ api: { fetchApi: vi.fn() } }))
vi.mock('@/services/providers/algoliaSearchProvider', () => ({ useAlgoliaSearchProvider: vi.fn() }))
vi.mock('@/services/providers/registrySearchProvider', () => ({ useComfyRegistrySearchProvider: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

it('searches the managed local catalog without initializing upstream providers', async () => {
  vi.mocked(api.fetchApi).mockResolvedValue({
    ok: true,
    json: async () => ({ node_packs: {
      impact: { id: 'impact', title: 'Impact Pack', reference: 'https://github.com/a/impact' }
    } })
  } as Response)

  const gateway = useRegistrySearchGateway()
  const result = await gateway.searchPacks('ImpactInt', {
    pageSize: 20,
    pageNumber: 0,
    restrictSearchableAttributes: ['comfy_nodes']
  })

  expect(useAlgoliaSearchProvider).not.toHaveBeenCalled()
  expect(useComfyRegistrySearchProvider).not.toHaveBeenCalled()
  expect(api.fetchApi).toHaveBeenCalledWith(expect.stringMatching(/^\/hyper-studio\/node-packs\?search=ImpactInt&.*mode=nodes$/))
  expect(result.nodePacks.map(pack => pack.id)).toEqual(['impact'])
})

import { api } from '@/scripts/api'
import { localManagerPacksForIds } from '@/workbench/extensions/manager/composables/nodePack/localManagerPackCatalog'
import type { SearchNodePacksParams } from '@/types/algoliaTypes'
import type { NodePackSearchProvider } from '@/types/searchServiceTypes'

/** Embedded Manager search reads only the managed engine's bundled catalog. */
export const useHyperStudioLocalSearchProvider = (): NodePackSearchProvider => ({
  searchPacks: async (query: string, params: SearchNodePacksParams) => {
    const search = new URLSearchParams({
      search: query,
      page: String(params.pageNumber),
      limit: String(params.pageSize),
      mode: params.restrictSearchableAttributes?.includes('comfy_nodes') ? 'nodes' : 'packs'
    })
    const response = await api.fetchApi(`/hyper-studio/node-packs?${search}`)
    if (!response.ok) throw new Error(`Local node catalog unavailable (${response.status})`)
    const data = await response.json()
    const ids = data && typeof data === 'object' && 'node_packs' in data && data.node_packs
      ? Object.keys(data.node_packs)
      : []
    return { nodePacks: localManagerPacksForIds(data, ids), querySuggestions: [] }
  },
  clearSearchCache: () => {}
})

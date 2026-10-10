import { get, useAsyncState } from '@vueuse/core'
import type { Ref } from 'vue'

import { localManagerPacksForIds } from './localManagerPackCatalog'
import { isHyperStudioEmbedded } from '@/platform/distribution/hyperStudio'
import { api } from '@/scripts/api'
import { useComfyRegistryStore } from '@/stores/comfyRegistryStore'
import type { UseNodePacksOptions } from '@/workbench/extensions/manager/types/comfyManagerTypes'

/**
 * Handles fetching node packs from the registry given a list of node pack IDs
 */
export const useNodePacks = (
  packsIds: string[] | Ref<string[]>,
  options: UseNodePacksOptions = {}
) => {
  const { immediate = false } = options
  const { getPacksByIds } = useComfyRegistryStore()

  const fetchPacks = async () => {
    const ids = get(packsIds).filter(Boolean)
    if (!ids.length) return []
    if (!isHyperStudioEmbedded) return getPacksByIds.call(ids)
    const response = await api.fetchApi('/v2/customnode/getlist?mode=local&skip_update=true')
    if (!response.ok) return []
    return localManagerPacksForIds(await response.json(), ids)
  }

  const {
    isReady,
    isLoading,
    error,
    execute,
    state: nodePacks
  } = useAsyncState(fetchPacks, [], {
    immediate
  })

  const cleanup = () => {
    getPacksByIds.cancel()
    isReady.value = false
    isLoading.value = false
  }

  return {
    error,
    isLoading,
    isReady,
    nodePacks,
    startFetch: execute,
    cleanup
  }
}

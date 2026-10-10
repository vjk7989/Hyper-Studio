import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { isHyperStudioEmbedded } from '@/platform/distribution/hyperStudio'
import { useDialogService } from '@/services/dialogService'
import type { components } from '@/types/comfyRegistryTypes'
import type { components as ManagerComponents } from '@/workbench/extensions/manager/types/generatedManagerTypes'
import { useConflictDetection } from '@/workbench/extensions/manager/composables/useConflictDetection'
import { useNodeConflictDialog } from '@/workbench/extensions/manager/composables/useNodeConflictDialog'
import { useComfyManagerStore } from '@/workbench/extensions/manager/stores/comfyManagerStore'
import type { ConflictDetail } from '@/workbench/extensions/manager/types/conflictDetectionTypes'
import type { LocalManagerPack } from './localManagerPackCatalog'

type NodePack = components['schemas']['Node']

export function usePackInstall(
  getNodePacks: () => NodePack[],
  getHasConflict?: () => boolean | undefined,
  getConflictInfo?: () => ConflictDetail[] | undefined
) {
  const managerStore = useComfyManagerStore()
  const { show: showNodeConflictDialog } = useNodeConflictDialog()
  const { checkNodeCompatibility } = useConflictDetection()
  const { t } = useI18n()

  // Check if any of the packs are currently being installed
  const isInstalling = computed(() => {
    const nodePacks = getNodePacks()
    if (!nodePacks.length) return false
    return nodePacks.some((pack) => managerStore.isPackInstalling(pack.id))
  })

  const createPayload = (installItem: NodePack) => {
    if (!installItem.id) {
      console.error(t('manager.packInstall.nodeIdRequired'))
      return
    }

    const localManagerPack = isHyperStudioEmbedded &&
      (installItem as Partial<LocalManagerPack>).hyperStudioLocalCatalog === true
    const isUnclaimedPack = localManagerPack || installItem.publisher?.name === 'Unclaimed'
    const versionToInstall = isUnclaimedPack
      ? ('nightly' as ManagerComponents['schemas']['SelectedVersion'])
      : (installItem.latest_version?.version ?? 'latest')

    return {
      id: localManagerPack
        ? (installItem as LocalManagerPack).hyperStudioManagerPackId
        : installItem.id,
      repository: installItem.repository ?? '',
      channel: (localManagerPack ? 'default' : 'dev') as ManagerComponents['schemas']['ManagerChannel'],
      mode: (localManagerPack ? 'local' : 'cache') as ManagerComponents['schemas']['ManagerDatabaseSource'],
      selected_version: versionToInstall,
      version: versionToInstall
    }
  }

  const installPack = (item: NodePack) => {
    const payload = createPayload(item)
    if (!payload) return Promise.resolve()
    return managerStore.installPack.call(payload)
  }

  const performInstallation = async (packs: NodePack[]) => {
    try {
      const results = await Promise.allSettled(packs.map(installPack))
      const failures = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      )
      if (failures.length) {
        console.error(
          '[usePackInstall] Some installations failed:',
          failures.map((f) => f.reason)
        )
      }
    } finally {
      managerStore.installPack.clear()
    }
  }

  const installAllPacks = async () => {
    const nodePacks = getNodePacks()
    if (!nodePacks.length) return

    const uninstalledPacks = nodePacks.filter(
      (pack) => !managerStore.isPackInstalled(pack.id)
    )
    if (!uninstalledPacks.length) return

    if (isHyperStudioEmbedded) {
      const confirmed = await useDialogService().confirm({
        key: 'hyper-studio-node-pack-install-review',
        title: 'Review third-party node installation',
        message:
          'These node packs run third-party code on your computer. Review the names and sources before installing. Hyper-Studio will not install them automatically.',
        itemList: uninstalledPacks.map((pack) =>
          [pack.name || pack.id || 'Unknown pack', pack.repository]
            .filter(Boolean)
            .join(' — ')
        ),
        hint: 'Only continue if you trust these sources.'
      })
      if (confirmed !== true) return
    }

    const hasConflict = getHasConflict?.()
    const conflictInfo = getConflictInfo?.()

    if (hasConflict) {
      if (!conflictInfo) return

      const conflictedPackages = nodePacks
        .map((pack) => {
          const compatibilityCheck = checkNodeCompatibility(pack)
          return {
            package_id: pack.id || '',
            package_name: pack.name || '',
            has_conflict: compatibilityCheck.hasConflict,
            conflicts: compatibilityCheck.conflicts,
            is_compatible: !compatibilityCheck.hasConflict
          }
        })
        .filter((result) => result.has_conflict)

      showNodeConflictDialog({
        conflictedPackages,
        buttonText: t('manager.conflicts.installAnyway'),
        onButtonClick: async () => {
          await performInstallation(uninstalledPacks)
        }
      })
      return
    }

    await performInstallation(uninstalledPacks)
  }

  return { isInstalling, installAllPacks, performInstallation }
}

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePackInstall } from './usePackInstall'

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  install: vi.fn(),
  clear: vi.fn(),
  conflictDialog: vi.fn()
}))

vi.mock(import('@/platform/distribution/hyperStudio'), () => ({
  isHyperStudioEmbedded: true
}))
vi.mock<unknown>(import('@/services/dialogService'), () => ({
  useDialogService: () => ({ confirm: mocks.confirm })
}))
vi.mock<unknown>(import('vue-i18n'), () => ({
  useI18n: () => ({ t: (key: string) => key })
}))
vi.mock<unknown>(
  import('@/workbench/extensions/manager/stores/comfyManagerStore'),
  () => ({
    useComfyManagerStore: () => ({
      isPackInstalled: () => false,
      isPackInstalling: () => false,
      installPack: { call: mocks.install, clear: mocks.clear }
    })
  })
)
vi.mock<unknown>(
  import('@/workbench/extensions/manager/composables/useNodeConflictDialog'),
  () => ({
    useNodeConflictDialog: () => ({ show: mocks.conflictDialog })
  })
)
vi.mock<unknown>(
  import('@/workbench/extensions/manager/composables/useConflictDetection'),
  () => ({
    useConflictDetection: () => ({ checkNodeCompatibility: vi.fn() })
  })
)

const pack = {
  id: 'example-pack',
  name: 'Example nodes',
  repository: 'https://example.test/nodes',
  publisher: { name: 'Example' },
  latest_version: { version: '1.2.3' }
}

describe('embedded node pack installation review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not install when the user dismisses the review', async () => {
    mocks.confirm.mockResolvedValue(null)
    await usePackInstall(() => [pack]).installAllPacks()

    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Review third-party node installation',
        itemList: ['Example nodes — https://example.test/nodes']
      })
    )
    expect(mocks.install).not.toHaveBeenCalled()
  })

  it('installs only after explicit confirmation', async () => {
    mocks.confirm.mockResolvedValue(true)
    mocks.install.mockResolvedValue(undefined)
    await usePackInstall(() => [pack]).installAllPacks()

    expect(mocks.install).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: 'example-pack',
        repository: 'https://example.test/nodes'
      })
    )
    expect(mocks.clear).toHaveBeenCalledOnce()
  })
})

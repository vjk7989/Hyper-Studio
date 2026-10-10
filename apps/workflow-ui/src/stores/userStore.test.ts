import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useUserStore } from './userStore'

const getUserConfig = vi.fn()
const embeddedState = vi.hoisted(() => ({ enabled: false }))

vi.mock('@/platform/distribution/hyperStudio', () => ({
  get isHyperStudioEmbedded() {
    return embeddedState.enabled
  }
}))

vi.mock<unknown>(import('@/scripts/api'), () => ({
  api: {
    getUserConfig: (...args: unknown[]) => getUserConfig(...args)
  }
}))

describe('userStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {})
    embeddedState.enabled = false
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not require an upstream user-selection login in embedded mode', async () => {
    embeddedState.enabled = true
    getUserConfig.mockResolvedValue({ users: { upstream: 'Upstream user' } })
    const store = useUserStore()
    await store.initialize()
    expect(store.needsLogin).toBe(false)
    embeddedState.enabled = false
  })

  describe('initialize', () => {
    it('fetches user config on first call', async () => {
      getUserConfig.mockResolvedValue({})
      const store = useUserStore()

      await store.initialize()

      expect(getUserConfig).toHaveBeenCalledTimes(1)
      expect(store.initialized).toBe(true)
    })

    it('is a no-op once already initialized', async () => {
      getUserConfig.mockResolvedValue({})
      const store = useUserStore()
      await store.initialize()
      getUserConfig.mockClear()

      await store.initialize()

      expect(getUserConfig).not.toHaveBeenCalled()
    })

    it('retries on a subsequent call when the first fetch failed', async () => {
      getUserConfig.mockRejectedValueOnce(new Error('network down'))
      getUserConfig.mockResolvedValueOnce({})
      const store = useUserStore()

      await expect(store.initialize()).rejects.toThrow('network down')
      expect(store.initialized).toBe(false)
      await expect(store.initialize()).resolves.toBeUndefined()

      expect(getUserConfig).toHaveBeenCalledTimes(2)
      expect(store.initialized).toBe(true)
    })

    it('deduplicates concurrent calls before the first fetch resolves', async () => {
      let resolveConfig: (value: unknown) => void = () => {}
      getUserConfig.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveConfig = resolve
          })
      )
      const store = useUserStore()

      const a = store.initialize()
      const b = store.initialize()
      resolveConfig({})
      await Promise.all([a, b])

      expect(getUserConfig).toHaveBeenCalledTimes(1)
    })
  })
})

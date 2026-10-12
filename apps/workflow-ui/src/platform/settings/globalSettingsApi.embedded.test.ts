import { describe, expect, it, vi } from 'vitest'

const remoteModuleLoads = vi.hoisted(() => ({ count: 0 }))
const fetchApi = vi.hoisted(() => vi.fn())

vi.mock<unknown>(import('@/scripts/api'), () => ({ api: { fetchApi } }))
vi.mock(import('@/platform/distribution/hyperStudio'), () => ({
  isHyperStudioEmbedded: true
}))
vi.mock(import('@/config/comfyApi'), () => {
  remoteModuleLoads.count += 1
  return { getComfyApiBaseUrl: () => 'https://should-not-load.invalid' }
})
vi.mock(import('@/platform/auth/unified/remintRetry'), () => {
  remoteModuleLoads.count += 1
  return {
    fetchWithUnifiedRemint: vi.fn(),
    shouldRemintCloudRequest: vi.fn()
  }
})

describe('embedded global settings transport', () => {
  it('uses only the managed local engine and loads no Cloud transport', async () => {
    fetchApi.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          key: 'Comfy.AgentPanel.ConsentAccepted',
          value: true,
          updated_at: '2026-09-09T00:00:00Z'
        })
      )
    )
    const { getGlobalSetting } = await import('./globalSettingsApi')

    await expect(
      getGlobalSetting('Comfy.AgentPanel.ConsentAccepted', {
        Authorization: 'Bearer local-engine-token'
      })
    ).resolves.toMatchObject({ value: true })
    expect(fetchApi).toHaveBeenCalledWith(
      '/global-settings/Comfy.AgentPanel.ConsentAccepted',
      expect.objectContaining({ cache: 'no-store' })
    )
    expect(remoteModuleLoads.count).toBe(0)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized, Router } from 'vue-router'

import type { useDialogService as realUseDialogService } from '@/services/dialogService'

const distribution = vi.hoisted(() => ({ isCloud: true, isDesktop: false }))
const hyperStudio = vi.hoisted(() => ({ embedded: false }))

vi.mock(import('@/platform/distribution/types'), () => ({
  get isCloud() {
    return distribution.isCloud
  },
  get isDesktop() {
    return distribution.isDesktop
  }
}))
vi.mock(import('@/platform/distribution/hyperStudio'), () => ({
  get isHyperStudioEmbedded() {
    return hyperStudio.embedded
  }
}))

vi.mock(import('@/services/dialogService'))

vi.mock<unknown>(import('@/stores/authStore'), () => ({
  useAuthStore: () => ({
    isInitialized: true,
    currentUser: null,
    getAuthHeader: async () => null
  })
}))

vi.mock<unknown>(import('@/stores/userStore'), () => ({
  useUserStore: () => ({ initialize: async () => {}, needsLogin: false })
}))

vi.mock<unknown>(import('@/composables/useFeatureFlags'), () => ({
  useFeatureFlags: () => ({ flags: { onboardingSurveyEnabled: false } })
}))

vi.mock<unknown>(
  import('@/platform/cloud/onboarding/desktopLoginRedemption'),
  () => ({ installDesktopLoginRedemption: vi.fn() })
)

vi.mock<unknown>(import('@/views/layouts/LayoutDefault.vue'), () => ({
  default: { name: 'LayoutDefault' }
}))

vi.mock<unknown>(import('@/platform/telemetry/reportError'), () => ({
  reportError: vi.fn()
}))

vi.mock(import('@/platform/telemetry'))

const OAUTH_REQUEST_ID = '550e8400-e29b-41d4-a716-446655440000'
const OAUTH_STORAGE_KEY = 'Comfy.OAuthRequestId'

/** Every named route the cloud onboarding table registers. */
const CLOUD_ROUTE_NAMES = [
  'cloud-login',
  'cloud-signup',
  'cloud-forgot-password',
  'cloud-survey',
  'cloud-user-check',
  'cloud-sorry-contact-support',
  'cloud-auth-timeout',
  'cloud-subscribe',
  'cloud-oauth-consent'
]

/**
 * `src/router.ts` decides at module scope which routes and guards exist, so
 * the flags under test must be set before it is evaluated. The getters above
 * read mutable objects, so flipping a flag and resetting the registry reloads
 * the router against that combination.
 */
async function loadRouter(embedded: boolean): Promise<Router> {
  hyperStudio.embedded = embedded
  vi.resetModules()
  return (await import('@/router')).default
}

/**
 * Aborts in a guard registered after the router's own, so a navigation settles
 * on whatever the module-scope guards decided without resolving a view. The
 * auth guard sees an already-initialized store and continues, so it never
 * leaves a component to load.
 */
async function observeNavigation(router: Router, target: string) {
  let observed: RouteLocationNormalized | undefined
  router.beforeEach((to) => {
    observed = to
    return false
  })
  await router.push(target)
  if (!observed) {
    throw new Error(`navigation to ${target} never reached a guard`)
  }
  return observed
}

describe('embedded startup cannot open a cloud account route', () => {
  beforeEach(() => {
    distribution.isCloud = true
    distribution.isDesktop = false
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('registers no cloud onboarding route', async () => {
    const router = await loadRouter(true)

    const names = router.getRoutes().map((route) => route.name)
    expect(names).toContain('GraphView')
    expect(names).not.toContain('UserSelectView')
    for (const cloudName of CLOUD_ROUTE_NAMES) {
      expect(names).not.toContain(cloudName)
    }
  })

  it('installs no desktop login redemption', async () => {
    await loadRouter(true)

    const { installDesktopLoginRedemption } = await import(
      '@/platform/cloud/onboarding/desktopLoginRedemption'
    )
    expect(installDesktopLoginRedemption).not.toHaveBeenCalled()
  })

  it('captures no OAuth request id on navigation', async () => {
    const router = await loadRouter(true)

    await observeNavigation(router, `/?oauth_request_id=${OAUTH_REQUEST_ID}`)

    expect(
      sessionStorage.getItem(OAUTH_STORAGE_KEY),
      'a captured id would let a later navigation resume the consent flow'
    ).toBeNull()
  })

  it('opens no sign-in dialog for an account path', async () => {
    const router = await loadRouter(true)
    const { useDialogService } = await import('@/services/dialogService')
    const dialogs = useDialogService() as ReturnType<typeof realUseDialogService>

    const to = await observeNavigation(router, '/cloud/login')

    expect(String(to.name)).not.toMatch(/^cloud-/)
    expect(dialogs.showSignInDialog).not.toHaveBeenCalled()
  })

  it('still lands an unknown path on the local graph route', async () => {
    const router = await loadRouter(true)

    const to = await observeNavigation(router, '/cloud/login')

    expect(to.path).toBe('/')
    expect(String(to.name)).not.toMatch(/^cloud-/)
  })

  it('redirects the upstream user-selection path to the graph', async () => {
    const router = await loadRouter(true)
    const to = await observeNavigation(router, '/user-select')
    expect(to.path).toBe('/')
  })
})

/**
 * The block above only means something if the same harness still reaches the
 * cloud surfaces with the flag cleared, so these run the identical navigation
 * against the identical module load.
 */
describe('cloud startup keeps its account routes', () => {
  beforeEach(() => {
    distribution.isCloud = true
    distribution.isDesktop = false
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('registers the cloud onboarding routes', async () => {
    const router = await loadRouter(false)

    const names = router.getRoutes().map((route) => route.name)
    for (const cloudName of CLOUD_ROUTE_NAMES) {
      expect(names).toContain(cloudName)
    }
  })

  it('installs desktop login redemption', async () => {
    await loadRouter(false)

    const { installDesktopLoginRedemption } = await import(
      '@/platform/cloud/onboarding/desktopLoginRedemption'
    )
    expect(installDesktopLoginRedemption).toHaveBeenCalledOnce()
  })

  it('captures the OAuth request id on navigation', async () => {
    const router = await loadRouter(false)

    await observeNavigation(router, `/?oauth_request_id=${OAUTH_REQUEST_ID}`)

    expect(sessionStorage.getItem(OAUTH_STORAGE_KEY)).toBe(OAUTH_REQUEST_ID)
  })

  it('still sends a signed-out desktop visitor to the cloud sign-in dialog', async () => {
    distribution.isDesktop = true
    const router = await loadRouter(false)
    const { useDialogService } = await import('@/services/dialogService')
    const dialogs = useDialogService() as ReturnType<typeof realUseDialogService>

    await router.push('/')

    expect(dialogs.showSignInDialog).toHaveBeenCalled()
  })
})

import { until } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { RouteLocationNormalized, Router } from 'vue-router'

import { useFeatureFlags } from '@/composables/useFeatureFlags'
import { captureOAuthRequestId } from '@/platform/cloud/oauth/oauthState'
import { installDesktopLoginRedemption } from '@/platform/cloud/onboarding/desktopLoginRedemption'
import { isDesktop } from '@/platform/distribution/types'
import { preserveLoggedOutShareAuthAttribution } from '@/platform/workflow/sharing/utils/shareAuthAttribution'
import { useDialogService } from '@/services/dialogService'
import { useAuthStore } from '@/stores/authStore'

const PUBLIC_ROUTE_NAMES = new Set([
  'cloud-login',
  'cloud-signup',
  'cloud-forgot-password',
  'cloud-oauth-consent',
  'cloud-sorry-contact-support'
])
const PUBLIC_ROUTE_PATHS = new Set([
  '/cloud/login',
  '/cloud/signup',
  '/cloud/forgot-password',
  '/oauth/consent',
  '/cloud/sorry-contact-support'
])

function isPublicRoute(to: RouteLocationNormalized) {
  const name = String(to.name)
  if (PUBLIC_ROUTE_NAMES.has(name)) return true
  return PUBLIC_ROUTE_PATHS.has(to.path)
}

/**
 * Installs account-only Cloud navigation. The embedded Hyper-Studio router
 * never imports this module, so OAuth, Firebase, and sign-in code are absent
 * from its startup graph and release entry chunks.
 */
export function installCloudAccountRouter(router: Router): void {
  router.beforeEach((to, _from, next) => {
    captureOAuthRequestId(to.query)
    next()
  })

  const { flags } = useFeatureFlags()
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    if (!authStore.isInitialized) {
      try {
        const { isInitialized } = storeToRefs(authStore)
        await until(isInitialized).toBe(true, { timeout: 16_000 })
      } catch (error) {
        console.error('Auth initialization failed:', error)
        return next({ name: 'cloud-auth-timeout' })
      }
    }

    const authHeader = await authStore.getAuthHeader()
    const isLoggedIn = !!authHeader
    preserveLoggedOutShareAuthAttribution(to.query, isLoggedIn)
    if (isPublicRoute(to)) return next()

    if (to.name === 'cloud-user-check') {
      if (to.meta.requiresAuth && !isLoggedIn) {
        return next({ name: 'cloud-login' })
      }
      return next()
    }

    if (from.name === 'cloud-user-check' && to.path === '/') return next()

    const query =
      to.fullPath === '/'
        ? undefined
        : { previousFullPath: encodeURIComponent(to.fullPath) }
    if (to.meta.requiresAuth && !isLoggedIn) {
      return next({ name: 'cloud-login', query })
    }

    if (!isLoggedIn) {
      if (isDesktop) {
        const loginSuccess = await useDialogService().showSignInDialog()
        return loginSuccess ? next() : next(false)
      }
      return next({ name: 'cloud-login', query })
    }

    if (!isDesktop && to.path === '/' && flags.onboardingSurveyEnabled) {
      const { getSurveyCompletedStatus } =
        await import('@/platform/cloud/onboarding/auth')
      try {
        if (!(await getSurveyCompletedStatus())) {
          return next({ name: 'cloud-survey' })
        }
      } catch (error) {
        console.error('Failed to check user status:', error)
        return next({ name: 'cloud-user-check' })
      }
    }

    return next()
  })

  installDesktopLoginRedemption(router)
}

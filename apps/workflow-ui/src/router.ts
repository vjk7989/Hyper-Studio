import {
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router'

import { isHyperStudioEmbedded } from '@/platform/distribution/hyperStudio'
import { isCloud, isDesktop } from '@/platform/distribution/types'
import { useTelemetry } from '@/platform/telemetry'
import { useUserStore } from '@/stores/userStore'
import LayoutDefault from '@/views/layouts/LayoutDefault.vue'

import { PRESERVED_QUERY_DEFINITIONS } from '@/platform/navigation/preservedQueryDefinitions'
import { installPreservedQueryTracker } from '@/platform/navigation/preservedQueryTracker'
import { unmatchedRouteRedirect } from '@/platform/navigation/unmatchedRoute'

/**
 * The embedded canvas is served by the local workflow engine and has no
 * Cloud account to authenticate against. Cloud routes and guards that can
 * open sign-in or redeem an account stay unregistered there.
 *
 * Exported so startup only syncs a cloud host identity when these cloud
 * routes and guards are active. Standalone desktop Firebase setup uses its
 * own distribution path.
 */
export const cloudAccountSurfacesEnabled = isCloud && !isHyperStudioEmbedded

const cloudOnboardingRoutes =
  import.meta.env.VITE_HYPER_STUDIO_EMBEDDED === 'true'
    ? []
    : cloudAccountSurfacesEnabled
      ? (await import('./platform/cloud/onboarding/onboardingCloudRoutes'))
          .cloudOnboardingRoutes
      : []

const isFileProtocol = window.location.protocol === 'file:'

/**
 * Determine base path for the router.
 * - Electron: always root
 * - Cloud: use Vite's BASE_URL (configured at build time)
 * - Standard web (including reverse proxy subpaths): use window.location.pathname
 *   to support deployments like http://mysite.com/ComfyUI/
 */
function getBasePath(): string {
  if (isDesktop) return '/'
  if (isCloud) return import.meta.env.BASE_URL || '/'
  return window.location.pathname
}

const basePath = getBasePath()

function trackPageView(): void {
  useTelemetry()?.trackPageView(document.title, {
    path: window.location.href
  })
}

const router = createRouter({
  history: isFileProtocol
    ? createWebHashHistory()
    : // Base path must be specified to ensure correct relative paths
      // Example: For URL 'http://localhost:7801/ComfyBackendDirect',
      // we need this base path or assets will incorrectly resolve from 'http://localhost:7801/'
      createWebHistory(basePath),
  routes: [
    ...(cloudAccountSurfacesEnabled ? cloudOnboardingRoutes : []),
    {
      path: '/',
      component: LayoutDefault,
      children: [
        {
          path: '',
          name: 'GraphView',
          component: () => import('@/views/GraphView.vue'),
          beforeEnter: async (_to, _from, next) => {
            // Then check user store
            const userStore = useUserStore()
            await userStore.initialize()
            if (userStore.needsLogin) {
              next('/user-select')
            } else {
              next()
            }
          }
        },
        ...(import.meta.env.VITE_HYPER_STUDIO_EMBEDDED !== 'true' &&
        !isHyperStudioEmbedded
          ? [
              {
                path: 'user-select',
                name: 'UserSelectView',
                component: () => import('@/views/UserSelectView.vue')
              }
            ]
          : [])
      ]
    },
    { path: '/:pathMatch(.*)*', redirect: unmatchedRouteRedirect }
  ],

  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

installPreservedQueryTracker(router, PRESERVED_QUERY_DEFINITIONS)

router.afterEach(() => {
  trackPageView()
})

if (
  import.meta.env.VITE_HYPER_STUDIO_EMBEDDED !== 'true' &&
  cloudAccountSurfacesEnabled
) {
  const { installCloudAccountRouter } = await import('./routerCloudAccount')
  installCloudAccountRouter(router)
}

export default router

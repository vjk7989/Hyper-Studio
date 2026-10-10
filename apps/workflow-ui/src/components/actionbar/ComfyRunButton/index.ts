import { defineAsyncComponent } from 'vue'

import { isCloud } from '@/platform/distribution/types'

export default import.meta.env.VITE_HYPER_STUDIO_EMBEDDED === 'true'
  ? defineAsyncComponent(() => import('./LocalRunButtonWrapper.vue'))
  : isCloud
    ? window.__CONFIG__?.subscription_required
      ? defineAsyncComponent(() => import('./CloudRunButtonWrapper.vue'))
      : defineAsyncComponent(() => import('./ComfyQueueButton.vue'))
    : defineAsyncComponent(() => import('./LocalRunButtonWrapper.vue'))

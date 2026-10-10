<template>
  <div
    class="dark-theme relative h-svh w-screen overflow-y-auto bg-primary-comfy-ink font-sans text-primary-comfy-canvas"
  >
    <img
      class="absolute top-6 left-6 size-8"
      src="/assets/images/hyper-studio-logo-single.svg"
      alt="Hyper-Studio"
    />
    <RouterView />
  </div>
  <GlobalToast />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'

import GlobalToast from '@/components/toast/GlobalToast.vue'

onMounted(() => {
  document.getElementById('splash-loader')?.remove()
})
</script>

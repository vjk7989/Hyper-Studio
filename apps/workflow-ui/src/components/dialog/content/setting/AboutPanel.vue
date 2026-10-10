<template>
  <div class="about-container flex flex-col gap-2" data-testid="about-panel">
    <h2 class="mb-2 text-2xl font-bold">
      {{ isHyperStudioEmbedded ? 'Hyper-Studio' : $t('g.about') }}
    </h2>
    <p v-if="isHyperStudioEmbedded" class="text-sm text-muted-foreground">
      Workflow engine and canvas are based on ComfyUI. Upstream source and GPL-3.0 license:
      <a href="https://github.com/comfyanonymous/ComfyUI" target="_blank" rel="noopener noreferrer">engine</a>,
      <a href="https://github.com/Comfy-Org/ComfyUI_frontend/tree/v1.55.14" target="_blank" rel="noopener noreferrer">canvas</a>.
    </p>
    <div v-if="!isHyperStudioEmbedded" class="space-y-2">
      <a
        v-for="badge in aboutPanelStore.badges"
        :key="badge.url"
        :href="badge.url"
        target="_blank"
        rel="noopener noreferrer"
        class="about-badge inline-flex items-center no-underline"
        :title="badge.url"
      >
        <Badge
          class="mr-2"
          :severity="badge.severity === 'warn' ? 'warning' : badge.severity"
        >
          <template #icon>
            <i :class="cn(badge.icon, 'mr-2 text-xl')" />
          </template>
          {{ badge.label }}
        </Badge>
      </a>
    </div>

    <div class="my-4 border-t border-interface-stroke" />

    <SystemStatsPanel
      v-if="systemStatsStore.systemStats"
      :stats="systemStatsStore.systemStats"
    />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@comfyorg/tailwind-utils'

import SystemStatsPanel from '@/components/common/SystemStatsPanel.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { useAboutPanelStore } from '@/stores/aboutPanelStore'
import { useSystemStatsStore } from '@/stores/systemStatsStore'
import { isHyperStudioEmbedded } from '@/platform/distribution/hyperStudio'

const systemStatsStore = useSystemStatsStore()
const aboutPanelStore = useAboutPanelStore()
</script>

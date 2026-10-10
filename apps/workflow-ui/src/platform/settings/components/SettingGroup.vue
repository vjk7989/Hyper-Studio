<template>
  <div class="setting-group">
    <div v-if="divider" class="my-8 border-t border-border-default" />
    <h3 class="text-base text-base-foreground">
      <span v-if="group.category" class="text-muted-foreground">
        {{
          isHyperStudioEmbedded && group.category === 'Comfy'
            ? 'Hyper-Studio'
            : $t(
                `settingsCategories.${normalizeI18nKey(group.category)}`,
                group.category
              )
        }}
        &#8250;
      </span>
      {{
        $t(`settingsCategories.${normalizeI18nKey(group.label)}`, group.label)
      }}
    </h3>
    <div
      v-for="setting in group.settings.filter((s) => !s.deprecated)"
      :key="setting.id"
      :data-setting-id="setting.id"
      class="setting-item mb-3"
    >
      <SettingItem :setting="setting" />
    </div>
  </div>
</template>

<script setup lang="ts">
import SettingItem from '@/platform/settings/components/SettingItem.vue'
import { isHyperStudioEmbedded } from '@/platform/distribution/hyperStudio'
import type { SettingParams } from '@/platform/settings/types'
import { normalizeI18nKey } from '@/utils/formatUtil'

defineProps<{
  group: {
    label: string
    category?: string
    settings: SettingParams[]
  }
  divider?: boolean
}>()
</script>

<style scoped>
.setting-group :deep(.form-label > span) {
  color: var(--color-muted-foreground);
}
</style>

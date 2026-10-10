<template>
  <div class="flex w-full justify-end gap-2">
    <Button
      v-if="currentStep === 1"
      variant="muted-textonly"
      size="lg"
      data-attr="upload-model-step1-cancel-button"
      :disabled="isFetchingMetadata || isUploading"
      @click="emit('close')"
    >
      {{ $t('g.cancel') }}
    </Button>
    <Button
      v-if="currentStep !== 1 && currentStep !== 3"
      variant="muted-textonly"
      size="lg"
      :data-attr="`upload-model-step${currentStep}-back-button`"
      :disabled="isFetchingMetadata || isUploading"
      @click="emit('back')"
    >
      {{ $t('g.back') }}
    </Button>
    <span v-else />

    <Button
      v-if="currentStep === 1"
      variant="secondary"
      size="lg"
      data-attr="upload-model-step1-continue-button"
      :disabled="!canFetchMetadata || isFetchingMetadata"
      @click="emit('fetchMetadata')"
    >
      <Loader v-if="isFetchingMetadata" />
      <span>{{ $t('g.continue') }}</span>
    </Button>
    <Button
      v-else-if="currentStep === 2"
      variant="secondary"
      size="lg"
      data-attr="upload-model-step2-confirm-button"
      :disabled="!canUploadModel || isUploading"
      @click="emit('upload')"
    >
      <Loader v-if="isUploading" />
      <span>{{ $t('assetBrowser.upload') }}</span>
    </Button>
    <template
      v-else-if="
        currentStep === 3 &&
        (uploadStatus === 'success' || uploadStatus === 'processing')
      "
    >
      <Button
        variant="muted-textonly"
        size="lg"
        data-attr="upload-model-step3-import-another-button"
        :disabled="!canImportAnother"
        @click="emit('importAnother')"
      >
        {{ $t('assetBrowser.importAnother') }}
      </Button>
      <Button
        variant="secondary"
        size="lg"
        data-attr="upload-model-step3-finish-button"
        @click="emit('close')"
      >
        {{
          uploadStatus === 'processing'
            ? $t('g.close')
            : $t('assetBrowser.finish')
        }}
      </Button>
    </template>
    <template v-else-if="currentStep === 3 && uploadStatus === 'error'">
      <Button
        variant="muted-textonly"
        size="lg"
        data-attr="upload-model-step3-back-button"
        @click="emit('back')"
      >
        {{ $t('g.back') }}
      </Button>
      <Button
        variant="secondary"
        size="lg"
        data-attr="upload-model-step3-close-button"
        @click="emit('close')"
      >
        {{ $t('g.close') }}
      </Button>
    </template>
  </div>
</template>

<script setup lang="ts">
import Loader from '@/components/loader/Loader.vue'
import Button from '@/components/ui/button/Button.vue'

const { canImportAnother = true } = defineProps<{
  currentStep: number
  isFetchingMetadata: boolean
  isUploading: boolean
  canFetchMetadata: boolean
  canUploadModel: boolean
  uploadStatus?: 'processing' | 'success' | 'error'
  canImportAnother?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'fetchMetadata'): void
  (e: 'upload'): void
  (e: 'close'): void
  (e: 'importAnother'): void
}>()
</script>

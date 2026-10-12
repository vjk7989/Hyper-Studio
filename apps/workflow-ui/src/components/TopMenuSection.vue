<template>
  <div
    v-if="!workspaceStore.focusMode"
    class="ml-(--comfy-canvas-gutter) flex flex-col gap-1 pt-(--comfy-canvas-gutter)"
    @mouseenter="isTopMenuHovered = true"
    @mouseleave="isTopMenuHovered = false"
  >
    <div class="flex gap-x-0.5">
      <div
        :inert="isActionBarsHidden"
        :aria-hidden="isActionBarsHidden"
        :class="
          cn(
            'max-h-16 min-w-0 flex-1 overflow-hidden transition-all duration-300 ease-in-out',
            isActionBarsHidden && 'max-h-0 -translate-x-8 opacity-0'
          )
        "
      >
        <SubgraphBreadcrumb />
      </div>

      <div class="ml-(--comfy-canvas-gutter) flex flex-col items-end gap-1">
        <div
          data-testid="top-menu-actionbars"
          :inert="isActionBarsHidden"
          :aria-hidden="isActionBarsHidden"
          :class="
            cn(
              'flex max-h-24 items-start gap-2 overflow-hidden transition-all duration-300 ease-in-out',
              isActionBarsHidden && 'max-h-0 translate-x-8 opacity-0'
            )
          "
        >
          <div
            v-if="!isHyperStudioEmbedded && (managerState.shouldShowManagerButtons.value || isCloud)"
            class="pointer-events-auto flex h-12 shrink-0 items-center rounded-lg border border-interface-stroke bg-comfy-menu-bg px-2 shadow-interface"
          >
            <Button
              v-tooltip.bottom="customNodesManagerTooltipConfig"
              variant="secondary"
              :aria-label="t('menu.manageExtensions')"
              class="relative"
              @click="openCustomNodeManager"
            >
              <i class="icon-[comfy--extensions-blocks] size-4" />
              <span class="not-md:hidden">
                {{ t('menu.manageExtensions') }}
              </span>
              <span
                v-if="shouldShowRedDot"
                class="absolute top-0.5 right-1 size-2 rounded-full bg-red-500"
              />
            </Button>
          </div>

          <div
            ref="actionbarCardRef"
            data-testid="action-bar-card"
            class="pointer-events-auto relative z-1 flex flex-col rounded-lg border border-interface-stroke bg-comfy-menu-bg px-2 py-1.75 shadow-interface"
          >
            <div
              :class="
                cn(
                  'actionbar-container relative flex items-center gap-2',
                  isActionbarContainerEmpty &&
                    '-ml-2 w-0 min-w-0 border-transparent shadow-none has-[.border-dashed]:ml-0 has-[.border-dashed]:w-auto has-[.border-dashed]:min-w-auto has-[.border-dashed]:border-interface-stroke has-[.border-dashed]:pl-2 has-[.border-dashed]:shadow-interface'
                )
              "
            >
              <ActionBarButtons />
              <!-- Support for legacy topbar elements attached by custom scripts, hidden if no elements present -->
              <div
                ref="legacyCommandsContainerRef"
                data-testid="legacy-topbar-container"
                class="[&:not(:has(*>*:not(:empty)))]:hidden"
              ></div>

              <ComfyActionbar
                :docked-progress-container="actionbarCardRef"
                :queue-overlay-expanded="isQueueOverlayExpanded"
                @update:progress-target="updateProgressTarget"
              />
              <CurrentUserButton
                v-if="isLoggedIn && !isIntegratedTabBar && !isHyperStudioEmbedded"
                class="shrink-0"
              />
              <LoginButton v-else-if="!isIntegratedTabBar && !isHyperStudioEmbedded" />
              <Button
                v-if="isCloud && workflowSharingEnabled"
                v-tooltip.bottom="shareTooltipConfig"
                variant="secondary"
                :aria-label="t('actionbar.shareTooltip')"
                @click="openCloudShareDialog"
                @pointerenter="prefetchCloudShareDialog"
              >
                <i class="icon-[comfy--send] size-4" />
                <span class="not-md:hidden">
                  {{ t('actionbar.share') }}
                </span>
              </Button>
              <div v-if="!isRightSidePanelOpen" class="relative">
                <Button
                  v-tooltip.bottom="rightSidePanelTooltipConfig"
                  :class="
                    cn(
                      showErrorIndicatorOnPanelButton &&
                        'outline-1 outline-destructive-background'
                    )
                  "
                  variant="secondary"
                  size="icon"
                  :aria-label="t('rightSidePanel.togglePanel')"
                  @click="openRightSidePanel"
                >
                  <i class="icon-[lucide--panel-right] size-4" />
                </Button>
                <StatusBadge
                  v-if="showErrorIndicatorOnPanelButton"
                  variant="dot"
                  severity="danger"
                  class="absolute -top-1 -right-1"
                />
              </div>
            </div>
            <FreeTierQuota v-if="!isActionbarFloating && !isHyperStudioEmbedded" />
            <!-- Complement of ComfyActionbar's `!isDocked` mount (same storage
                 key), so at most one caption renders in any menu state. -->
            <PartnerNodesRunCaption v-if="isActionbarDocked && !isHyperStudioEmbedded" />
          </div>
        </div>
        <ErrorOverlay v-if="!isActionBarsHidden" />
        <QueueProgressOverlay
          v-if="isQueueProgressOverlayEnabled"
          v-model:expanded="isQueueOverlayExpanded"
          :menu-hovered="isTopMenuHovered"
        />
      </div>
    </div>

    <div class="flex flex-col items-end gap-1">
      <Teleport
        v-if="inlineProgressSummaryTarget"
        :to="inlineProgressSummaryTarget"
      >
        <div
          class="pointer-events-none absolute inset-x-0 top-full mt-1 flex justify-end pr-1"
        >
          <QueueInlineProgressSummary
            :hidden="shouldHideInlineProgressSummary"
          />
        </div>
      </Teleport>
      <QueueInlineProgressSummary
        v-else-if="shouldShowInlineProgressSummary && !isActionbarFloating"
        class="pr-1"
        :hidden="shouldHideInlineProgressSummary"
      />
      <QueueNotificationBannerHost
        v-if="isActionbarEnabled"
        :class="cn('pr-1', isActionBarsHidden && 'hidden')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLocalStorage, useMutationObserver } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watchEffect
} from 'vue'
import { useI18n } from 'vue-i18n'

import ComfyActionbar from '@/components/actionbar/ComfyActionbar.vue'
import PartnerNodesRunCaption from '@/components/actionbar/PartnerNodesRunCaption.vue'
import SubgraphBreadcrumb from '@/components/breadcrumb/SubgraphBreadcrumb.vue'
import QueueInlineProgressSummary from '@/components/queue/QueueInlineProgressSummary.vue'
import QueueNotificationBannerHost from '@/components/queue/QueueNotificationBannerHost.vue'
import QueueProgressOverlay from '@/components/queue/QueueProgressOverlay.vue'
import ErrorOverlay from '@/components/error/ErrorOverlay.vue'
import ActionBarButtons from '@/components/topbar/ActionBarButtons.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Button from '@/components/ui/button/Button.vue'
import { useQueueFeatureFlags } from '@/composables/queue/useQueueFeatureFlags'
import { useErrorHandling } from '@/composables/useErrorHandling'
import { buildTooltipConfig } from '@/composables/useTooltipConfig'
import { isHyperStudioEmbedded } from '@/platform/distribution/hyperStudio'
import { useSettingStore } from '@/platform/settings/settingStore'
import { app } from '@/scripts/app'
import { useExecutionErrorStore } from '@/stores/executionErrorStore'
import { useAgentNodeSelectionStore } from '@/stores/agentNodeSelectionStore'
import { useActionBarButtonStore } from '@/stores/actionBarButtonStore'
import { useQueueUIStore } from '@/stores/queueStore'
import { useRightSidePanelStore } from '@/stores/workspace/rightSidePanelStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { isCloud } from '@/platform/distribution/types'
import { useConflictAcknowledgment } from '@/workbench/extensions/manager/composables/useConflictAcknowledgment'
import { useManagerState } from '@/workbench/extensions/manager/composables/useManagerState'
import { ManagerTab } from '@/workbench/extensions/manager/types/comfyManagerTypes'
import { cn } from '@comfyorg/tailwind-utils'

const embeddedBuild =
  import.meta.env.VITE_HYPER_STUDIO_EMBEDDED === 'true'
const EmptyEmbeddedSurface = { render: () => null }
const CurrentUserButton =
  import.meta.env.VITE_HYPER_STUDIO_EMBEDDED === 'true'
  ? EmptyEmbeddedSurface
  : defineAsyncComponent(
      () => import('@/components/topbar/CurrentUserButton.vue')
    )
const LoginButton = import.meta.env.VITE_HYPER_STUDIO_EMBEDDED === 'true'
  ? EmptyEmbeddedSurface
  : defineAsyncComponent(() => import('@/components/topbar/LoginButton.vue'))
const FreeTierQuota = import.meta.env.VITE_HYPER_STUDIO_EMBEDDED === 'true'
  ? EmptyEmbeddedSurface
  : defineAsyncComponent(
      () =>
        import('@/platform/cloud/subscription/components/FreeTierQuota.vue')
    )

const settingStore = useSettingStore()
const workspaceStore = useWorkspaceStore()
const rightSidePanelStore = useRightSidePanelStore()
const agentNodeSelectionStore = useAgentNodeSelectionStore()
const isActionBarsHidden = computed(
  () => agentNodeSelectionStore.isActionBarsHidden
)
const managerState = useManagerState()
const isLoggedIn = ref(false)
const workflowSharingEnabled = ref(false)
const { t } = useI18n()
const { toastErrorHandler } = useErrorHandling()
const executionErrorStore = useExecutionErrorStore()
const actionBarButtonStore = useActionBarButtonStore()
const queueUIStore = useQueueUIStore()
const { isOverlayExpanded: isQueueOverlayExpanded } = storeToRefs(queueUIStore)
const { shouldShowRedDot: shouldShowConflictRedDot } =
  useConflictAcknowledgment()
const isTopMenuHovered = ref(false)
const actionbarCardRef = ref<HTMLElement>()
const isActionbarDocked = useLocalStorage('Comfy.MenuPosition.Docked', true)
const actionbarPosition = computed(() => settingStore.get('Comfy.UseNewMenu'))
const isActionbarEnabled = computed(
  () => actionbarPosition.value !== 'Disabled'
)
const isActionbarFloating = computed(
  () => isActionbarEnabled.value && !isActionbarDocked.value
)
/**
 * Whether the actionbar container has any visible docked buttons
 * (excluding ComfyActionbar, which uses position:fixed when floating
 * and does not contribute to the container's visual layout).
 */
const hasDockedButtons = computed(() => {
  if (actionBarButtonStore.buttons.length > 0) return true
  if (hasLegacyContent.value) return true
  if (!isIntegratedTabBar.value) return true
  if (isCloud && workflowSharingEnabled.value) return true
  if (!isRightSidePanelOpen.value) return true
  return false
})
const isActionbarContainerEmpty = computed(
  () => isActionbarFloating.value && !hasDockedButtons.value
)
const isIntegratedTabBar = computed(
  () => settingStore.get('Comfy.UI.TabBarLayout') !== 'Legacy'
)
const { isQueuePanelV2Enabled, isRunProgressBarEnabled } =
  useQueueFeatureFlags()
const isQueueProgressOverlayEnabled = computed(
  () => !isQueuePanelV2Enabled.value && !isActionBarsHidden.value
)
const shouldShowInlineProgressSummary = computed(
  () =>
    isQueuePanelV2Enabled.value &&
    isActionbarEnabled.value &&
    isRunProgressBarEnabled.value &&
    !isActionBarsHidden.value
)
const progressTarget = ref<HTMLElement | null>(null)
function updateProgressTarget(target: HTMLElement | null) {
  progressTarget.value = target
}
const inlineProgressSummaryTarget = computed(() => {
  if (!shouldShowInlineProgressSummary.value || !isActionbarFloating.value) {
    return null
  }
  return progressTarget.value
})
const shouldHideInlineProgressSummary = computed(
  () => isQueueProgressOverlayEnabled.value && isQueueOverlayExpanded.value
)
const customNodesManagerTooltipConfig = computed(() =>
  buildTooltipConfig(t('menu.manageExtensions'))
)
const shareTooltipConfig = computed(() =>
  buildTooltipConfig(t('actionbar.shareTooltip'))
)

const shouldShowRedDot = computed((): boolean => {
  return shouldShowConflictRedDot.value
})

const { hasAnyError, isErrorOverlayOpen } = storeToRefs(executionErrorStore)

const isErrorsTabEnabled = computed(() =>
  settingStore.get('Comfy.RightSidePanel.ShowErrorsTab')
)

const showErrorIndicatorOnPanelButton = computed(
  () =>
    isErrorsTabEnabled.value &&
    hasAnyError.value &&
    !isRightSidePanelOpen.value &&
    !isErrorOverlayOpen.value
)

// Right side panel toggle
const { isOpen: isRightSidePanelOpen } = storeToRefs(rightSidePanelStore)
const rightSidePanelTooltipConfig = computed(() =>
  buildTooltipConfig(t('rightSidePanel.togglePanel'))
)

function openRightSidePanel() {
  if (!embeddedBuild) {
    void import('@/platform/telemetry').then(({ useTelemetry }) => {
      useTelemetry()?.trackUiButtonClicked({
        button_id: 'right_side_panel_opened',
        element_group: 'top_menu'
      })
    })
  }
  rightSidePanelStore.togglePanel()
}

// Maintain support for legacy topbar elements attached by custom scripts
const legacyCommandsContainerRef = ref<HTMLElement>()
const hasLegacyContent = ref(false)
let legacyContentCheckRafId: number | null = null

function checkLegacyContent() {
  const el = legacyCommandsContainerRef.value
  if (!el) {
    hasLegacyContent.value = false
    return
  }
  // Mirror the CSS: [&:not(:has(*>*:not(:empty)))]:hidden
  hasLegacyContent.value =
    el.querySelector(':scope > * > *:not(:empty)') !== null
}

function scheduleLegacyContentCheck() {
  if (legacyContentCheckRafId !== null) return

  legacyContentCheckRafId = requestAnimationFrame(() => {
    legacyContentCheckRafId = null
    checkLegacyContent()
  })
}

useMutationObserver(legacyCommandsContainerRef, scheduleLegacyContentCheck, {
  childList: true,
  subtree: true
})

onMounted(() => {
  if (legacyCommandsContainerRef.value) {
    app.menu.element.style.width = 'fit-content'
    legacyCommandsContainerRef.value.appendChild(app.menu.element)
    checkLegacyContent()
  }
  if (!embeddedBuild) {
    void Promise.all([
      import('@/composables/auth/useCurrentUser'),
      import('@/composables/useFeatureFlags')
    ]).then(([{ useCurrentUser }, { useFeatureFlags }]) => {
      const currentUser = useCurrentUser()
      const featureFlags = useFeatureFlags()
      watchEffect(() => {
        isLoggedIn.value = currentUser.isLoggedIn.value
        workflowSharingEnabled.value = featureFlags.flags.workflowSharingEnabled
      })
    })
  }
})

async function openCloudShareDialog() {
  if (embeddedBuild) return
  try {
    const { openShareDialog } =
      await import('@/platform/workflow/sharing/composables/lazyShareDialog')
    await openShareDialog()
  } catch (error) {
    toastErrorHandler(error)
  }
}

function prefetchCloudShareDialog() {
  if (embeddedBuild) return
  void import('@/platform/workflow/sharing/composables/lazyShareDialog').then(
    ({ prefetchShareDialog }) => prefetchShareDialog()
  )
}

onBeforeUnmount(() => {
  if (legacyContentCheckRafId === null) return

  cancelAnimationFrame(legacyContentCheckRafId)
  legacyContentCheckRafId = null
})

const openCustomNodeManager = async () => {
  if (isCloud) {
    if (embeddedBuild) return
    const { useManagerSurveyDialog } =
      await import('@/workbench/extensions/manager/composables/useManagerSurveyDialog')
    useManagerSurveyDialog().show()
    return
  }
  try {
    await managerState.openManager({
      initialTab: ManagerTab.All,
      showToastOnLegacyError: false
    })
  } catch (error) {
    try {
      toastErrorHandler(error)
    } catch (toastError) {
      console.error(error)
      console.error(toastError)
    }
  }
}
</script>

import { computed, ref } from 'vue'

import type { BillingContext } from '@/composables/billing/types'

const resolved = async () => {}

/**
 * Local-only billing facade for the Hyper-Studio embedded distribution.
 *
 * Workflow execution is controlled by the managed local engine and provider
 * profiles, so inherited Cloud subscription state must neither gate a run nor
 * pull account/checkout code into the packaged canvas.
 */
const context: BillingContext = {
  type: computed(() => 'legacy'),
  isInitialized: ref(true),
  subscription: computed(() => null),
  balance: computed(() => null),
  plans: computed(() => []),
  currentPlanSlug: computed(() => null),
  teamCreditStops: computed(() => null),
  currentTeamCreditStop: computed(() => null),
  maxSeats: computed(() => null),
  occupiedSeats: computed(() => null),
  isLoading: ref(false),
  error: ref(null),
  canAccessSubscriptionFeatures: computed(() => true),
  isFreeTier: computed(() => false),
  billingStatus: computed(() => null),
  subscriptionStatus: computed(() => null),
  tier: computed(() => null),
  renewalDate: computed(() => null),
  isLegacyTeamPlan: computed(() => false),
  isTeamPlan: computed(() => false),
  canRunWorkflows: computed(() => true),
  showsSubscribeToRunPrompt: computed(() => false),
  getMaxSeats: () => 0,
  initialize: resolved,
  fetchStatus: resolved,
  fetchBalance: resolved,
  reconcileSubscriptionSuccess: resolved,
  readCheckoutOperation: async () => false,
  subscribe: resolved,
  previewSubscribe: async () => null,
  manageSubscription: resolved,
  cancelSubscription: resolved,
  resubscribe: resolved,
  topup: resolved,
  fetchPlans: resolved,
  requireActiveSubscription: resolved,
  showSubscriptionDialog: () => {}
}

export function useBillingContext(): BillingContext {
  return context
}

import { computed } from 'vue'

/**
 * The inherited hosted Agent requires an account and Cloud consent record.
 * Hyper-Studio does not register that surface, so callers receive an inert
 * consent gate and cannot open an account dialog or contact Cloud services.
 */
export function useAgentConsent() {
  return {
    accepted: computed(() => false),
    isChecking: computed(() => false),
    withConsent: async (
      _onAccept: () => void,
      _hooks: unknown = {},
      _trigger: unknown = 'first_load'
    ) => {}
  }
}

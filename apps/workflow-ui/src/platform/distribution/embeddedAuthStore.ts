import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * Account authentication is intentionally unavailable in the embedded
 * Hyper-Studio canvas. The build aliases the inherited auth store to this
 * inert shape so shared local components can keep their compatibility calls
 * without pulling Firebase, billing, workspace account, or Cloud URLs into
 * the shipped application.
 */
export class AuthStoreError extends Error {
  readonly status: number | undefined

  constructor(message = 'Account sign-in is unavailable in Hyper-Studio', status?: number) {
    super(message)
    this.name = 'AuthStoreError'
    this.status = status
  }
}

const unavailable = async (): Promise<never> => {
  throw new AuthStoreError()
}
const noAuth = async () => null
const noToken = async () => undefined

export const useAuthStore = defineStore('auth', () => {
  const loading = ref(false)
  const currentUser = ref(null)
  const isInitialized = ref(true)
  const balance = ref(null)
  const lastBalanceUpdateTime = ref<Date | null>(null)
  const isFetchingBalance = ref(false)
  const tokenRefreshTrigger = ref(0)
  const isAuthenticated = computed(() => false)
  const userEmail = computed(() => null)
  const userId = computed(() => null)

  return {
    loading,
    currentUser,
    isInitialized,
    balance,
    lastBalanceUpdateTime,
    isFetchingBalance,
    tokenRefreshTrigger,
    isAuthenticated,
    userEmail,
    userId,
    login: unavailable,
    register: unavailable,
    logout: async () => {},
    createCustomer: unavailable,
    fetchWithCustomerRecovery: unavailable,
    getIdToken: noToken,
    loginWithGoogle: unavailable,
    loginWithGithub: unavailable,
    initiateCreditPurchase: unavailable,
    fetchBalance: noAuth,
    accessBillingPortal: unavailable,
    sendPasswordReset: unavailable,
    updatePassword: unavailable,
    getAuthHeader: noAuth,
    getAuthHeaderOrThrow: unavailable,
    getFirebaseAuthHeader: noAuth,
    getFirebaseAuthHeaderOrThrow: unavailable,
    getUserAuthHeader: noAuth,
    currentUserIdentity: () => null,
    getWorkspaceAuthHeader: noAuth,
    getWorkspaceAuthHeaderOrThrow: unavailable,
    getAuthToken: noToken,
    getWorkspaceAuthToken: noToken,
    notifyTokenRefreshed: () => {}
  }
})

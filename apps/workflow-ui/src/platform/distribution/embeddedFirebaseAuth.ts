/** Account flows are unavailable; these values keep shared error branches linkable. */
export const AuthErrorCodes = {
  NETWORK_REQUEST_FAILED: 'auth/network-request-failed',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'auth/requires-recent-login'
} as const

export const getAdditionalUserInfo = () => null

/** Local workflow projects have no application account session. */
const unavailable = () =>
  Promise.reject(new Error('Account sign-in is unavailable in Hyper-Studio'))

export const firebaseIdentity = {
  initialize: () => {},
  currentUser: () => null,
  onUserChanged: (callback: (user: null) => void) => {
    queueMicrotask(() => callback(null))
    return () => {}
  },
  onTokenChanged: (callback: (user: null) => void) => {
    queueMicrotask(() => callback(null))
    return () => {}
  },
  signInWithGoogle: unavailable,
  signInWithGitHub: unavailable,
  signInWithEmail: unavailable,
  createUserWithEmail: unavailable,
  sendPasswordReset: unavailable,
  updatePassword: unavailable,
  signOut: async () => {}
}

import { describe, expect, it, vi } from 'vitest'

import { firebaseIdentity } from './embeddedAccountIdentity'

describe('embedded account identity', () => {
  it('settles as signed out without creating an application account', async () => {
    const onUserChanged = vi.fn()
    const onTokenChanged = vi.fn()

    firebaseIdentity.initialize()
    firebaseIdentity.onUserChanged(onUserChanged)
    firebaseIdentity.onTokenChanged(onTokenChanged)

    expect(firebaseIdentity.currentUser()).toBeNull()
    expect(onUserChanged).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(onUserChanged).toHaveBeenCalledExactlyOnceWith(null)
    expect(onTokenChanged).toHaveBeenCalledExactlyOnceWith(null)
  })

  it('rejects inherited account sign-in actions', async () => {
    await expect(firebaseIdentity.signInWithGoogle()).rejects.toThrow(
      'Account sign-in is unavailable in Hyper-Studio'
    )
    await expect(firebaseIdentity.signInWithEmail()).rejects.toThrow(
      'Account sign-in is unavailable in Hyper-Studio'
    )
  })
})

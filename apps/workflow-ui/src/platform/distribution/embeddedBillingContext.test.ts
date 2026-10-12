import { describe, expect, it } from 'vitest'

import { useBillingContext } from './embeddedBillingContext'

describe('embeddedBillingContext', () => {
  it('allows managed local workflows without account or subscription state', async () => {
    const context = useBillingContext()

    expect(context.isInitialized.value).toBe(true)
    expect(context.canAccessSubscriptionFeatures.value).toBe(true)
    expect(context.canRunWorkflows.value).toBe(true)
    expect(context.showsSubscribeToRunPrompt.value).toBe(false)
    expect(context.subscription.value).toBeNull()

    await expect(context.requireActiveSubscription()).resolves.toBeUndefined()
    await expect(context.readCheckoutOperation()).resolves.toBe(false)
  })
})

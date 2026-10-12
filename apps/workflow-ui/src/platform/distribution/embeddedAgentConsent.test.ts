import { describe, expect, it, vi } from 'vitest'

import { useAgentConsent } from './embeddedAgentConsent'

describe('embeddedAgentConsent', () => {
  it('never opens the inherited hosted Agent surface', async () => {
    const onAccept = vi.fn()
    const consent = useAgentConsent()

    expect(consent.accepted.value).toBe(false)
    expect(consent.isChecking.value).toBe(false)
    await consent.withConsent(onAccept)
    expect(onAccept).not.toHaveBeenCalled()
  })
})

import { getProfileSnapshot, getProviderProfileStore, importLegacyProviderKeys } from '../provider-profiles-main'
import { modelsForProfile, testProfileConnection } from '../provider-jobs/adapters'
import { handle } from './typed-handle'

export function registerProviderProfileHandlers(): void {
  handle('listProviderProfiles', () => getProviderProfileStore().list())
  handle('upsertProviderProfile', input => getProviderProfileStore().upsert(input))
  handle('deleteProviderProfile', ({ id }) => getProviderProfileStore().delete(id))
  handle('getProviderVaultStatus', () => getProviderProfileStore().status())
  handle('setProviderVaultPassphrase', ({ passphrase }) => {
    getProviderProfileStore().setPassphrase(passphrase)
    return true
  })
  handle('unlockProviderVault', ({ passphrase }) => getProviderProfileStore().unlock(passphrase))
  handle('importLegacyProviderKeys', () => ({ imported: importLegacyProviderKeys() }))
  handle('listProviderModels', ({ profileId }) => {
    const profile = getProviderProfileStore().list().find(item => item.id === profileId)
    if (!profile) throw new Error('Provider profile not found')
    return modelsForProfile(profile)
  })
  handle('testProviderProfile', async ({ id }) => ({
    ...await testProfileConnection(getProfileSnapshot(id)),
    checkType: 'configuration' as const,
  }))
}

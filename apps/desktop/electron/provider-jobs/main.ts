import { getProfileSnapshot, getProviderProfileStore } from '../provider-profiles-main'
import { registeredProjectFolder } from '../project-registry'
import { listMedia, registerMedia } from '../project-workspace'
import { getMainWindow } from '../window'
import { handle } from '../ipc/typed-handle'
import { modelsForProfile } from './adapters'
import { ProviderJobBroker } from './broker'

export const providerJobBroker = new ProviderJobBroker({
  profile: getProfileSnapshot,
  projectFolder: registeredProjectFolder,
  registerMedia: (folder, relativePath) => registerMedia(folder, relativePath, { kind: 'video', origin: 'editor' }),
})

let registered = false
export function registerProviderJobHandlers(): void {
  if (registered) return
  registered = true
  handle('submitProviderJob', input => providerJobBroker.submit(input))
  handle('getProviderJob', ({ jobId }) => providerJobBroker.get(jobId))
  handle('cancelProviderJob', ({ jobId }) => providerJobBroker.cancel(jobId))
  providerJobBroker.onChanged(job => {
    getMainWindow()?.webContents.send('provider-job-changed', job)
    if (job.outputs.length) getMainWindow()?.webContents.send('workspace-media-changed', { projectId: job.projectId, entries: listMedia(registeredProjectFolder(job.projectId)) })
  })
}

export function bridgeProfiles() { return getProviderProfileStore().list() }
export function bridgeModels(profileId: string) { return modelsForProfile(getProfileSnapshot(profileId)) }

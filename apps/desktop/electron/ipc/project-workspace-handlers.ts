import { app, shell } from 'electron'
import { allProjectFolderRecords, bindProject, getSharedStorageRoot, projectFolderRecord, registeredProjectFolder, setSharedStorageRoot, unbindProject } from '../project-registry'
import { importLegacyEditorData, importMedia, listMedia, openProjectFolder, readEditorData, registerMedia, writeEditorData } from '../project-workspace'
import { validateProjectTrashTarget } from '../project-removal'
import { providerJobBroker } from '../provider-jobs/main'
import { getAuthToken, getBackendUrl, isGenerationActive } from '../python-backend'
import { getWorkflowEngineStatus, stopWorkflowEngine } from '../workflow-engine'
import { getMainWindow } from '../window'
import { handle } from './typed-handle'

const watches = new Map<string, { timer: NodeJS.Timeout; last: string }>()

function emitMedia(projectId: string): void {
  const entries = listMedia(registeredProjectFolder(projectId))
  const watch = watches.get(projectId)
  const signature = JSON.stringify(entries)
  if (watch && watch.last === signature) return
  if (watch) watch.last = signature
  getMainWindow()?.webContents.send('workspace-media-changed', { projectId, entries })
}

export function registerProjectWorkspaceHandlers(): void {
  handle('getSharedStorageRoot', () => getSharedStorageRoot())
  handle('setSharedStorageRoot', ({ folder }) => setSharedStorageRoot(folder))

  handle('openWorkspaceProject', input => {
    if (input.projectId) providerJobBroker.resumeProject(input.projectId)
    const result = openProjectFolder(input)
    providerJobBroker.resumeProject(result.manifest.projectId)
    bindProject(result.manifest.projectId, result.folder)
    return result.manifest
  })
  handle('importLegacyProject', input => {
    providerJobBroker.resumeProject(input.projectId)
    const result = openProjectFolder(input)
    importLegacyEditorData(result.folder, input.legacyProject)
    providerJobBroker.resumeProject(result.manifest.projectId)
    bindProject(result.manifest.projectId, result.folder)
    return result.manifest
  })
  handle('removeWorkspaceProject', async ({ projectId, mode }) => {
    const finish = providerJobBroker.beginProjectRemoval(projectId)
    let removed = false
    try {
      const record = projectFolderRecord(projectId)
      const folder = mode === 'trash' ? (() => {
        if (!record) throw new Error('Only managed project folders can be trashed')
        return validateProjectTrashTarget({ projectId, folder: record, sharedRoot: getSharedStorageRoot(),
          userData: app.getPath('userData'), registeredFolders: allProjectFolderRecords() })
      })() : record
      if (isGenerationActive()) throw new Error('Project has active Editor generation jobs')
      const backendUrl = getBackendUrl()
      const backendToken = getAuthToken()
      if (backendUrl && backendToken) {
        let queue: { active?: unknown; queued?: unknown[] }
        try {
          const response = await fetch(`${backendUrl}/api/generation-queue`, {
            headers: { Authorization: `Bearer ${backendToken}` }, signal: AbortSignal.timeout(3000),
          })
          if (!response.ok) throw new Error('Editor queue unavailable')
          queue = await response.json() as typeof queue
          if (!Array.isArray(queue.queued)) throw new Error('Invalid Editor queue')
        } catch { throw new Error('Cannot verify active Editor jobs') }
        if (queue.active || queue.queued.length) throw new Error('Project has active Editor generation jobs')
      }
      const engine = getWorkflowEngineStatus()
      if (engine.projectId === projectId && engine.state === 'starting') throw new Error('Project workflow engine is starting')
      if (engine.projectId === projectId && engine.state === 'running' && engine.url) {
        let queue: { queue_running?: unknown[]; queue_pending?: unknown[] }
        try {
          const response = await fetch(`${engine.url}queue`, { signal: AbortSignal.timeout(3000) })
          if (!response.ok) throw new Error('Workflow queue unavailable')
          queue = await response.json() as typeof queue
          if (!Array.isArray(queue.queue_running) || !Array.isArray(queue.queue_pending)) throw new Error('Invalid workflow queue')
        } catch { throw new Error('Cannot verify active workflow jobs') }
        if (queue.queue_running.length || queue.queue_pending.length) throw new Error('Project has active workflow jobs')
      }
      if (engine.projectId === projectId && engine.state !== 'stopped') await stopWorkflowEngine()
      if (mode === 'trash') await shell.trashItem(folder!)
      unbindProject(projectId)
      const watch = watches.get(projectId)
      if (watch) clearInterval(watch.timer)
      watches.delete(projectId)
      removed = true
      return { folder }
    } finally { finish(removed) }
  })
  handle('readWorkspaceProjectData', ({ projectId }) => readEditorData(registeredProjectFolder(projectId)))
  handle('writeWorkspaceProjectData', ({ projectId, project }) => {
    writeEditorData(registeredProjectFolder(projectId), project)
    return true
  })
  handle('listWorkspaceMedia', ({ projectId }) => listMedia(registeredProjectFolder(projectId)))
  handle('importWorkspaceMedia', ({ projectId, sourcePath, kind }) => {
    const entry = importMedia(registeredProjectFolder(projectId), sourcePath, kind)
    emitMedia(projectId)
    return entry
  })
  handle('registerWorkspaceMedia', ({ projectId, relativePath, kind, origin }) => {
    const entry = registerMedia(registeredProjectFolder(projectId), relativePath, { kind, origin })
    emitMedia(projectId)
    return entry
  })
  handle('watchWorkspaceMedia', ({ projectId }) => {
    registeredProjectFolder(projectId)
    if (watches.has(projectId)) return true
    const timer = setInterval(() => {
      try { emitMedia(projectId) } catch { /* Folder may be temporarily unavailable. */ }
    }, 2000)
    timer.unref()
    watches.set(projectId, { timer, last: '' })
    emitMedia(projectId)
    return true
  })
  handle('unwatchWorkspaceMedia', ({ projectId }) => {
    const watch = watches.get(projectId)
    if (watch) clearInterval(watch.timer)
    watches.delete(projectId)
    return true
  })
  app.on('before-quit', () => {
    for (const watch of watches.values()) clearInterval(watch.timer)
    watches.clear()
  })
}

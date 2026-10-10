import { app } from 'electron'
import { bindProject, getSharedStorageRoot, registeredProjectFolder, setSharedStorageRoot } from '../project-registry'
import { importLegacyEditorData, importMedia, listMedia, openProjectFolder, readEditorData, registerMedia, writeEditorData } from '../project-workspace'
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
    const result = openProjectFolder(input)
    bindProject(result.manifest.projectId, result.folder)
    return result.manifest
  })
  handle('importLegacyProject', input => {
    const result = openProjectFolder(input)
    importLegacyEditorData(result.folder, input.legacyProject)
    bindProject(result.manifest.projectId, result.folder)
    return result.manifest
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

import path from 'node:path'
import { dialog } from 'electron'
import { registeredProjectFolder } from '../project-registry'
import { exportProjectWorkflow, importProjectWorkflow, listProjectWorkflows, openProjectWorkflow, saveProjectWorkflow } from '../workflow-files'
import { getMainWindow } from '../window'
import { handle } from './typed-handle'

export function registerWorkflowFileHandlers(): void {
  handle('listProjectWorkflows', ({ projectId }) => listProjectWorkflows(registeredProjectFolder(projectId)))
  handle('openProjectWorkflow', ({ projectId, name }) => ({ name, contents: openProjectWorkflow(registeredProjectFolder(projectId), name) }))
  handle('saveProjectWorkflow', ({ projectId, name, contents }) => ({ name: saveProjectWorkflow(registeredProjectFolder(projectId), name, contents) }))
  handle('importProjectWorkflow', async ({ projectId }) => {
    const folder = registeredProjectFolder(projectId)
    const window = getMainWindow()
    if (!window) return null
    const chosen = await dialog.showOpenDialog(window, {
      title: 'Import workflow JSON', defaultPath: path.join(folder, 'workflows'),
      properties: ['openFile'], filters: [{ name: 'Workflow JSON', extensions: ['json'] }],
    })
    if (chosen.canceled || !chosen.filePaths[0]) return null
    const name = importProjectWorkflow(folder, chosen.filePaths[0])
    return { name, contents: openProjectWorkflow(folder, name) }
  })
  handle('exportProjectWorkflow', async ({ projectId, name }) => {
    const folder = registeredProjectFolder(projectId)
    const window = getMainWindow()
    if (!window) return false
    const chosen = await dialog.showSaveDialog(window, {
      title: 'Export workflow JSON', defaultPath: path.join(folder, 'workflows', name),
      filters: [{ name: 'Workflow JSON', extensions: ['json'] }],
    })
    if (chosen.canceled || !chosen.filePath) return false
    exportProjectWorkflow(folder, name, chosen.filePath)
    return true
  })
}

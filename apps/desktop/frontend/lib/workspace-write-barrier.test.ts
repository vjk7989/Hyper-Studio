import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { openProjectFolder, writeEditorData } from '../../electron/project-workspace.ts'
import { loadAfterWorkspaceWrite } from './workspace-write-barrier.ts'

function projectFolder(): string {
  const root = path.resolve('.local-tmp', 'workspace-write-barrier')
  fs.mkdirSync(root, { recursive: true })
  return fs.mkdtempSync(path.join(root, 'project-'))
}

describe('workspace reopen write barrier', () => {
  it('waits for a pending rename before loading the manifest', async () => {
    const folder = projectFolder()
    openProjectFolder({ folder, projectId: 'project-1', name: 'Initial', mode: 'editor' })
    let releaseWrite!: () => void
    const write = new Promise<void>(resolve => { releaseWrite = resolve }).then(() => {
      writeEditorData(folder, { id: 'project-1', name: 'Renamed', workspaceMode: 'editor', assets: [] })
    })
    const writes = new Map<string, Promise<unknown>>([['project-1', write]])
    let loadCount = 0
    const reopening = loadAfterWorkspaceWrite(writes, 'project-1', async () => { loadCount++; return openProjectFolder({ folder }).manifest })
    await Promise.resolve()
    assert.equal(loadCount, 0)
    releaseWrite()
    assert.equal((await reopening).name, 'Renamed')
    assert.equal(loadCount, 1)
    fs.rmSync(folder, { recursive: true, force: true })
  })

  it('waits for a pending mode switch before loading the manifest', async () => {
    const folder = projectFolder()
    openProjectFolder({ folder, projectId: 'project-1', name: 'Project', mode: 'editor' })
    let releaseWrite!: () => void
    const write = new Promise<void>(resolve => { releaseWrite = resolve }).then(() => {
      writeEditorData(folder, { id: 'project-1', name: 'Project', workspaceMode: 'workflow', assets: [] })
    })
    const writes = new Map<string, Promise<unknown>>([['project-1', write]])
    const reopening = loadAfterWorkspaceWrite(writes, 'project-1', async () => openProjectFolder({ folder }).manifest)
    releaseWrite()
    assert.equal((await reopening).mode, 'workflow')
    fs.rmSync(folder, { recursive: true, force: true })
  })

  it('does not reopen from stale disk metadata when the save failed', async () => {
    const writes = new Map<string, Promise<unknown>>([['project-1', Promise.reject(new Error('save failed'))]])
    let loaded = false
    await assert.rejects(loadAfterWorkspaceWrite(writes, 'project-1', async () => { loaded = true }), /save failed/)
    assert.equal(loaded, false)
  })
})

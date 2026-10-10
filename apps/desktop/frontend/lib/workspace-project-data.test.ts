import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hydrateProjectFromWorkspace, prepareWorkspaceProject, restoreWorkspaceProject } from './workspace-project-data.ts'
import type { Project } from '../types/project-model'
import { createDefaultTimeline, normalizeProject } from '../types/project-model.ts'
import type { WorkspaceManifest } from '../../shared/electron-api-schema'

describe('workspace project serialization', () => {
  it('stores contained media paths relatively and restores them on reopen', () => {
    const project = { id: 'one', projectFolder: 'G:\\Film', assets: [{ path: 'G:\\Film\\outputs\\clip.mp4', prompt: 'G:\\Film\\outputs\\clip.mp4' }] } as Project
    const saved = prepareWorkspaceProject(project) as Record<string, unknown>
    assert.equal(Object.hasOwn(saved, 'projectFolder'), false)
    assert.equal((saved.assets as Array<{path:string}>)[0].path, 'outputs/clip.mp4')
    assert.equal((saved.assets as Array<{prompt:string}>)[0].prompt, 'G:\\Film\\outputs\\clip.mp4')
    const reopened = restoreWorkspaceProject(saved, 'G:\\Film') as Project
    assert.equal(reopened.assets[0].path, 'G:\\Film/outputs/clip.mp4')
  })

  it('reopens the manifest and editor file over stale local project metadata', () => {
    const timeline = createDefaultTimeline()
    const cached = normalizeProject({ id: 'one', name: 'Old name', projectFolder: 'C:/Old', workspaceMode: 'editor', createdAt: 1, updatedAt: 1, assets: [], timelines: [timeline] })
    const manifest: WorkspaceManifest = { version: 1, projectId: 'one', name: 'Current name', mode: 'workflow', createdAt: 2, updatedAt: 3, paths: { assets: 'assets', outputs: 'outputs', workflows: 'workflows' } }
    const saved = { ...cached, projectFolder: undefined, assets: [{ id: 'a', type: 'video', path: 'outputs/clip.mp4', prompt: '', resolution: '', createdAt: 2 }] }
    const reopened = hydrateProjectFromWorkspace(manifest, 'G:/New', saved, cached)
    assert.equal(reopened.name, 'Current name')
    assert.equal(reopened.workspaceMode, 'workflow')
    assert.equal(reopened.projectFolder, 'G:/New')
    assert.equal(reopened.assets[0].path, 'G:/New/outputs/clip.mp4')
  })
})

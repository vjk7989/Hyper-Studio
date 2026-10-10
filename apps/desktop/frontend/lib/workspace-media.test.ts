import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeWorkspaceMedia, projectRelativePath } from './workspace-media.ts'
import type { Asset } from '../types/project-model'

describe('projectRelativePath', () => {
  it('keeps a file inside the selected project and rejects a sibling prefix', () => {
    assert.equal(projectRelativePath('G:\\Work\\Film', 'G:\\Work\\Film\\outputs\\clip.mp4'), 'outputs/clip.mp4')
    assert.equal(projectRelativePath('G:\\Work\\Film', 'G:\\Work\\Film-other\\clip.mp4'), null)
  })
})

describe('mergeWorkspaceMedia', () => {
  it('shows new workflow files in the editor while preserving existing asset IDs', () => {
    const existing: Asset = { id: 'timeline-asset', type: 'video', path: 'G:\\Film\\assets\\one.mp4', prompt: '', resolution: '', createdAt: 1 }
    const entries = [
      { id: '1', kind: 'video' as const, relativePath: 'assets/one.mp4', absolutePath: 'G:\\Film\\assets\\one.mp4', createdAt: 1 },
      { id: '2', kind: 'video' as const, relativePath: 'outputs/two.mp4', absolutePath: 'G:\\Film\\outputs\\two.mp4', createdAt: 2 },
    ]
    const merged = mergeWorkspaceMedia([existing], entries)
    assert.deepEqual(merged.map(asset => asset.id), ['workspace-2', 'timeline-asset'])
    assert.equal(mergeWorkspaceMedia(merged, entries), merged)
  })
})

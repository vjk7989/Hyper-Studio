import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { importLegacyEditorData, importMedia, listMedia, openProjectFolder, readEditorData, registerMedia, resolveProjectPath, writeEditorData } from './project-workspace.ts'

const tempRoot = path.resolve('.local-tmp', 'workspace-tests')
fs.mkdirSync(tempRoot, { recursive: true })
const created: string[] = []

function sandbox(): string {
  const dir = fs.mkdtempSync(path.join(tempRoot, 'project-'))
  created.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of created.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

describe('project workspace', () => {
  it('creates a versioned manifest and reopens the same project after restart', () => {
    const folder = sandbox()
    const first = openProjectFolder({ folder, projectId: 'project-1', name: 'First', mode: 'editor' })
    assert.equal(first.manifest.version, 1)
    for (const name of ['assets', 'outputs', 'workflows', '.hyper-studio']) {
      assert.equal(fs.statSync(path.join(folder, name)).isDirectory(), true)
    }
    const reopened = openProjectFolder({ folder })
    assert.deepEqual(reopened.manifest, first.manifest)
    assert.throws(() => openProjectFolder({ folder, projectId: 'different' }), /does not match/)
  })

  it('saves editor state in the folder and updates manifest metadata', () => {
    const folder = sandbox()
    openProjectFolder({ folder, projectId: 'project-2', name: 'Initial', mode: 'editor' })
    const data = { id: 'project-2', name: 'Renamed', workspaceMode: 'workflow', assets: [] }
    writeEditorData(folder, data)
    assert.deepEqual(readEditorData(folder), data)
    assert.equal(openProjectFolder({ folder }).manifest.name, 'Renamed')
    assert.equal(openProjectFolder({ folder }).manifest.mode, 'workflow')
    assert.throws(() => writeEditorData(folder, { ...data, apiKey: 'secret' }), /credentials/)
    assert.throws(() => writeEditorData(folder, { ...data, id: 'wrong' }), /does not match/)
  })

  it('imports legacy editor state once without touching the source', () => {
    const folder = sandbox()
    const legacyFolder = sandbox()
    const mediaPath = path.join(legacyFolder, 'old-video.mp4')
    const thumbnailPath = path.join(legacyFolder, 'old-thumb.png')
    fs.writeFileSync(mediaPath, 'legacy-video')
    fs.writeFileSync(thumbnailPath, 'legacy-thumbnail')
    const source = { id: 'legacy', name: 'Legacy', workspaceMode: 'editor', assets: [{
      id: 'clip-1', path: mediaPath, bigThumbnailPath: thumbnailPath,
      takes: [{ path: mediaPath, smallThumbnailPath: thumbnailPath }],
    }] }
    openProjectFolder({ folder, projectId: 'legacy', name: 'Legacy', mode: 'editor' })
    importLegacyEditorData(folder, source)
    const imported = readEditorData(folder) as typeof source
    assert.match(imported.assets[0].path, /^assets\/old-video-[a-f0-9]{12}\.mp4$/)
    assert.match(imported.assets[0].bigThumbnailPath, /^assets\/old-thumb-[a-f0-9]{12}\.png$/)
    assert.equal(imported.assets[0].takes[0].path, imported.assets[0].path)
    assert.equal(listMedia(folder).length, 2)
    assert.equal(fs.readFileSync(mediaPath, 'utf8'), 'legacy-video')
    assert.equal(source.assets[0].path, mediaPath)
    assert.throws(() => importLegacyEditorData(folder, source), /already has editor data/)
  })

  it('reports missing legacy media without deleting its source project', () => {
    const folder = sandbox()
    openProjectFolder({ folder, projectId: 'missing', name: 'Missing', mode: 'editor' })
    const source = { id: 'missing', name: 'Missing', assets: [{ path: path.join(sandbox(), 'absent.mp4') }] }
    assert.throws(() => importLegacyEditorData(folder, source), /Project media file is missing/)
    assert.equal(readEditorData(folder), null)
    assert.equal(source.assets[0].path.endsWith('absent.mp4'), true)
  })

  it('normalizes external media on every save without duplicating project copies', () => {
    const folder = sandbox()
    const external = path.join(sandbox(), 'reference.jpg')
    fs.writeFileSync(external, 'reference')
    openProjectFolder({ folder, projectId: 'portable', name: 'Portable', mode: 'editor' })
    const data = { id: 'portable', name: 'Portable', assets: [{ path: external }] }
    writeEditorData(folder, data)
    const stored = readEditorData(folder) as typeof data
    assert.match(stored.assets[0].path, /^assets\/reference-[a-f0-9]{12}\.jpg$/)
    assert.equal(fs.readFileSync(path.join(folder, stored.assets[0].path), 'utf8'), 'reference')
    writeEditorData(folder, data)
    assert.equal(listMedia(folder).length, 1)
    assert.equal(fs.readFileSync(external, 'utf8'), 'reference')
    assert.equal(data.assets[0].path, external)
    assert.throws(() => writeEditorData(folder, { ...data, assets: [{ path: '../secret.mp4' }] }), /assets or outputs/)
  })

  it('stores media references relatively, rediscovers outputs, and preserves imports', () => {
    const folder = sandbox()
    openProjectFolder({ folder, projectId: 'project-3', name: 'Media', mode: 'editor' })
    const external = path.join(sandbox(), 'source.mp4')
    fs.writeFileSync(external, 'video')
    const imported = importMedia(folder, external)
    assert.equal(imported.relativePath, 'assets/source.mp4')
    assert.equal(fs.readFileSync(external, 'utf8'), 'video')
    const output = path.join(folder, 'outputs', 'render.webm')
    fs.writeFileSync(output, 'render')
    const entries = listMedia(folder)
    assert.equal(entries.length, 2)
    assert.equal(entries.find(entry => entry.relativePath === 'outputs/render.webm')?.origin, 'workflow')
    const raw = fs.readFileSync(path.join(folder, '.hyper-studio', 'media.json'), 'utf8')
    assert.equal(raw.includes(folder), false)
    assert.equal(listMedia(folder).length, 2)
    fs.unlinkSync(output)
    assert.equal(listMedia(folder).length, 1)
  })

  it('blocks traversal and symlink escape when registering media', () => {
    const folder = sandbox()
    openProjectFolder({ folder, projectId: 'project-4', name: 'Safe', mode: 'editor' })
    assert.throws(() => resolveProjectPath(folder, '../outside.mp4'), /relative and contained/)
    fs.writeFileSync(path.join(folder, 'workflows', 'test.mp4'), 'not media')
    assert.throws(() => registerMedia(folder, 'workflows/test.mp4'), /Media must be inside/)
    const external = path.join(sandbox(), 'outside.mp4')
    fs.writeFileSync(external, 'outside')
    const linked = path.join(folder, 'assets', 'linked.mp4')
    try {
      fs.symlinkSync(external, linked)
      assert.throws(() => registerMedia(folder, 'assets/linked.mp4'), /symbolic links/)
    } catch (error) {
      if (process.platform !== 'win32' || (error as NodeJS.ErrnoException).code !== 'EPERM') throw error
    }
  })

  it('rejects poisoned media index paths on reopen', () => {
    const folder = sandbox()
    openProjectFolder({ folder, projectId: 'project-5', name: 'Safe Index', mode: 'editor' })
    fs.writeFileSync(path.join(folder, '.hyper-studio', 'media.json'), JSON.stringify({
      version: 1, entries: [{ id: 'bad', relativePath: '../outside.mp4' }],
    }))
    assert.throws(() => listMedia(folder), /relative and contained/)
  })
})

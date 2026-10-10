import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import type { WorkspaceManifest, WorkspaceMediaEntry } from '../shared/electron-api-schema'

const META = '.hyper-studio'
const MEDIA_EXTENSIONS: Record<string, WorkspaceMediaEntry['kind']> = {
  '.mp4': 'video', '.mov': 'video', '.webm': 'video', '.mkv': 'video',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image', '.gif': 'image',
  '.mp3': 'audio', '.wav': 'audio', '.flac': 'audio', '.m4a': 'audio', '.ogg': 'audio',
}

function assertProjectId(id: string): void {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error('Invalid project ID')
}

function isWithin(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
}

function assertNoSymlink(root: string, candidate: string): void {
  let current = root
  for (const segment of path.relative(root, candidate).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error('Project paths cannot include symbolic links')
    }
  }
}

export function resolveProjectPath(root: string, relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath) || /(^|[\\/])\.\.([\\/]|$)/.test(relativePath)) {
    throw new Error('Project path must be relative and contained')
  }
  const canonicalRoot = fs.realpathSync(root)
  const result = path.resolve(canonicalRoot, relativePath)
  if (!isWithin(canonicalRoot, result) || result === canonicalRoot) throw new Error('Project path escapes folder')
  assertNoSymlink(canonicalRoot, result)
  return result
}

function atomicJson(file: string, data: unknown): void {
  const temp = `${file}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 })
    fs.renameSync(temp, file)
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp)
  }
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function metadataFile(root: string, name: string): string {
  return resolveProjectPath(root, `${META}/${name}`)
}

export function openProjectFolder(input: {
  folder: string
  projectId?: string
  name?: string
  mode?: 'editor' | 'workflow'
}): { folder: string; manifest: WorkspaceManifest } {
  if (!path.isAbsolute(input.folder)) throw new Error('Project folder must be absolute')
  fs.mkdirSync(input.folder, { recursive: true })
  const folder = fs.realpathSync(input.folder)
  const manifestPath = metadataFile(folder, 'project.json')
  let manifest: WorkspaceManifest
  if (fs.existsSync(manifestPath)) {
    const found = readJson(manifestPath) as WorkspaceManifest
    if (found.version !== 1 || !found.projectId || !found.name || !['editor', 'workflow'].includes(found.mode)
      || found.paths?.assets !== 'assets' || found.paths?.outputs !== 'outputs' || found.paths?.workflows !== 'workflows') {
      throw new Error('Unsupported or invalid project manifest')
    }
    assertProjectId(found.projectId)
    if (input.projectId && input.projectId !== found.projectId) throw new Error('Project ID does not match folder manifest')
    manifest = found
  } else {
    if (!input.projectId || !input.name || !input.mode) throw new Error('Project ID, name, and mode are required for a new project')
    assertProjectId(input.projectId)
    const now = Date.now()
    manifest = { version: 1, projectId: input.projectId, name: input.name, mode: input.mode,
      createdAt: now, updatedAt: now, paths: { assets: 'assets', outputs: 'outputs', workflows: 'workflows' } }
  }
  for (const dir of ['assets', 'outputs', 'workflows', META]) {
    fs.mkdirSync(resolveProjectPath(folder, dir), { recursive: true })
  }
  if (!fs.existsSync(manifestPath)) atomicJson(manifestPath, manifest)
  const indexPath = metadataFile(folder, 'media.json')
  if (!fs.existsSync(indexPath)) atomicJson(indexPath, { version: 1, entries: [] })
  return { folder, manifest }
}

export function readEditorData(root: string): unknown | null {
  const file = metadataFile(root, 'editor.json')
  return fs.existsSync(file) ? readJson(file) : null
}

export function writeEditorData(root: string, data: unknown): void {
  // The renderer owns the editor schema. Keep the file bounded and reject credential fields.
  const serialized = JSON.stringify(data)
  if (!serialized || Buffer.byteLength(serialized) > 50 * 1024 * 1024) throw new Error('Invalid or oversized project data')
  const parsed = JSON.parse(serialized) as unknown
  const pending: unknown[] = [parsed]
  while (pending.length) {
    const value = pending.pop()
    if (!value || typeof value !== 'object') continue
    for (const [key, child] of Object.entries(value)) {
      if (/(api.?key|secret|password|access.?token|auth.?token)/i.test(key)) {
        throw new Error('Project data must not contain credentials')
      }
      if (child && typeof child === 'object') pending.push(child)
    }
  }
  const project = parsed as { id?: unknown; name?: unknown; workspaceMode?: unknown }
  const manifestPath = metadataFile(root, 'project.json')
  const manifest = readJson(manifestPath) as WorkspaceManifest
  if (project.id !== manifest.projectId) throw new Error('Project data ID does not match folder manifest')
  const portable = normalizeEditorMedia(root, parsed)
  if (typeof project.name === 'string' && project.name.trim()) manifest.name = project.name
  if (project.workspaceMode === 'editor' || project.workspaceMode === 'workflow') manifest.mode = project.workspaceMode
  manifest.updatedAt = Date.now()
  atomicJson(metadataFile(root, 'editor.json'), portable)
  atomicJson(manifestPath, manifest)
}

type Index = { version: 1; entries: WorkspaceMediaEntry[] }

function readIndex(root: string): Index {
  const value = readJson(metadataFile(root, 'media.json')) as Index
  if (value.version !== 1 || !Array.isArray(value.entries)) throw new Error('Invalid media index')
  return { version: 1, entries: value.entries.map(entry => ({ ...entry,
    absolutePath: resolveProjectPath(root, entry.relativePath) })) }
}

function writeIndex(root: string, index: Index): void {
  atomicJson(metadataFile(root, 'media.json'), {
    version: 1,
    entries: index.entries.map(({ absolutePath: _absolutePath, ...entry }) => entry),
  })
}

function mediaKind(file: string): WorkspaceMediaEntry['kind'] {
  return MEDIA_EXTENSIONS[path.extname(file).toLowerCase()] ?? 'other'
}

function toRelative(root: string, absolute: string): string {
  const rel = path.relative(root, absolute).split(path.sep).join('/')
  if (!/^(assets|outputs)\//.test(rel)) throw new Error('Media must be inside assets or outputs')
  return rel
}

export function registerMedia(root: string, relativePath: string, options: {
  kind?: WorkspaceMediaEntry['kind']; origin?: WorkspaceMediaEntry['origin']
} = {}): WorkspaceMediaEntry {
  const absolutePath = resolveProjectPath(root, relativePath)
  const normalized = toRelative(fs.realpathSync(root), absolutePath)
  const stat = fs.statSync(absolutePath)
  if (!stat.isFile()) throw new Error('Media path is not a file')
  const index = readIndex(root)
  const now = Date.now()
  const existing = index.entries.find(entry => entry.relativePath === normalized)
  const entry: WorkspaceMediaEntry = {
    id: existing?.id ?? randomUUID(), relativePath: normalized, absolutePath,
    kind: options.kind ?? existing?.kind ?? mediaKind(absolutePath),
    origin: options.origin ?? existing?.origin ?? 'external',
    createdAt: existing?.createdAt ?? stat.birthtimeMs ?? now, updatedAt: now, size: stat.size,
  }
  index.entries = [...index.entries.filter(item => item.relativePath !== normalized), entry]
  writeIndex(root, index)
  return entry
}

export function importMedia(root: string, sourcePath: string, kind?: WorkspaceMediaEntry['kind']): WorkspaceMediaEntry {
  if (!path.isAbsolute(sourcePath)) throw new Error('Media source must be absolute')
  const source = fs.realpathSync(sourcePath)
  if (!fs.statSync(source).isFile()) throw new Error('Media source is not a file')
  const assetDir = resolveProjectPath(root, 'assets')
  const parsed = path.parse(source)
  let target = path.join(assetDir, parsed.base)
  for (let suffix = 1; fs.existsSync(target); suffix++) target = path.join(assetDir, `${parsed.name}(${suffix})${parsed.ext}`)
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL)
  return registerMedia(root, toRelative(fs.realpathSync(root), target), { kind, origin: 'import' })
}

function isGeneratedThumbnail(file: string): boolean {
  const suffix = /(?:_big|_small)_thumbnail\.png$/i
  let name = path.basename(file)
  const dir = path.dirname(file)
  while (suffix.test(name)) {
    name = name.replace(suffix, '.png')
    if (fs.existsSync(path.join(dir, name))) return true
  }
  return false
}

export function listMedia(root: string): WorkspaceMediaEntry[] {
  const index = readIndex(root)
  const known = new Set(index.entries.map(entry => entry.relativePath))
  let changed = false
  for (const top of ['assets', 'outputs'] as const) {
    const walk = (dir: string): void => {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.isSymbolicLink()) continue
        const absolute = path.join(dir, item.name)
        if (item.isDirectory()) walk(absolute)
        else if (item.isFile() && mediaKind(absolute) !== 'other' && !isGeneratedThumbnail(absolute)) {
          const relativePath = toRelative(fs.realpathSync(root), absolute)
          if (!known.has(relativePath)) {
            const stat = fs.statSync(absolute)
            index.entries.push({ id: randomUUID(), relativePath, absolutePath: absolute,
              kind: mediaKind(absolute), origin: top === 'outputs' ? 'workflow' : 'external',
              createdAt: stat.birthtimeMs, updatedAt: stat.mtimeMs, size: stat.size })
            known.add(relativePath)
            changed = true
          }
        }
      }
    }
    walk(resolveProjectPath(root, top))
  }
  const before = index.entries.length
  index.entries = index.entries.filter(entry => {
    if ((entry.origin === 'external' || entry.origin === 'workflow')
      && isGeneratedThumbnail(resolveProjectPath(root, entry.relativePath))) return false
    try { return fs.statSync(resolveProjectPath(root, entry.relativePath)).isFile() } catch { return false }
  })
  if (index.entries.length !== before) changed = true
  if (changed) writeIndex(root, index)
  return index.entries
}

export function importLegacyEditorData(root: string, data: unknown): void {
  if (readEditorData(root) !== null) throw new Error('This project already has editor data')
  writeEditorData(root, data)
}

const EDITOR_MEDIA_FIELDS = new Set([
  'path', 'bigThumbnailPath', 'smallThumbnailPath', 'inputImageUrl', 'inputLastImageUrl',
  'inputAudioUrl', 'retakeVideoPath', 'extendVideoPath', 'icLoraVideoPath',
])

function normalizeEditorMedia(root: string, copy: unknown): unknown {
  if (copy && typeof copy === 'object' && !Array.isArray(copy)) delete (copy as Record<string, unknown>).projectFolder
  const references: Array<{ object: Record<string, unknown>; key: string; source: string }> = []
  const pending: unknown[] = [copy]
  while (pending.length) {
    const current = pending.pop()
    if (!current || typeof current !== 'object') continue
    for (const [key, value] of Object.entries(current)) {
      if (typeof value === 'string' && EDITOR_MEDIA_FIELDS.has(key) && value) {
        if (/^file:/i.test(value)) throw new Error('File URLs are not portable project media references')
        if (/^(https?:|data:|blob:)/i.test(value)) continue
        if (path.isAbsolute(value)) {
          if (!fs.existsSync(value) || !fs.statSync(value).isFile()) {
            throw new Error(`Project media file is missing: ${value}`)
          }
          references.push({ object: current as Record<string, unknown>, key, source: value })
        } else {
          const normalized = value.replace(/\\/g, '/')
          if (!/^(assets|outputs)\//.test(normalized)) {
            throw new Error(`Project media reference must be in assets or outputs: ${value}`)
          }
          resolveProjectPath(root, normalized)
          ;(current as Record<string, unknown>)[key] = normalized
        }
      } else if (value && typeof value === 'object') {
        pending.push(value)
      }
    }
  }
  const imported = new Map<string, string>()
  const canonicalRoot = fs.realpathSync(root)
  for (const reference of references) {
    const canonicalSource = fs.realpathSync(reference.source)
    let relativePath = imported.get(canonicalSource)
    if (!relativePath) {
      const existing = path.relative(canonicalRoot, canonicalSource).split(path.sep).join('/')
      if (/^(assets|outputs)\//.test(existing)) {
        relativePath = registerMedia(root, existing, { origin: 'import' }).relativePath
      } else {
        const stat = fs.statSync(canonicalSource)
        const sourceName = path.parse(canonicalSource)
        const fingerprint = createHash('sha256').update(`${canonicalSource}\0${stat.size}\0${stat.mtimeMs}`).digest('hex').slice(0, 12)
        const targetName = `${sourceName.name.slice(0, 80)}-${fingerprint}${sourceName.ext}`
        const targetPath = resolveProjectPath(root, `assets/${targetName}`)
        if (!fs.existsSync(targetPath)) fs.copyFileSync(canonicalSource, targetPath, fs.constants.COPYFILE_EXCL)
        relativePath = registerMedia(root, `assets/${targetName}`, { origin: 'import' }).relativePath
      }
      imported.set(canonicalSource, relativePath)
    }
    reference.object[reference.key] = relativePath
  }
  return copy
}

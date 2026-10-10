import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { getProjectFolder, readAppState, removeProjectFolder, setProjectFolder } from './app-state'
import { resolveProjectPath } from './project-workspace'

type Registry = { version: 1; projects: Record<string, string> }

export function getProjectRegistryPath(): string {
  return path.join(app.getPath('userData'), 'project_registry.json')
}

function readRegistry(): Registry {
  const file = getProjectRegistryPath()
  if (!fs.existsSync(file)) return { version: 1, projects: {} }
  const value = JSON.parse(fs.readFileSync(file, 'utf8')) as Registry
  if (value.version !== 1 || !value.projects || typeof value.projects !== 'object') {
    throw new Error('Invalid project registry')
  }
  return value
}

export function bindProject(projectId: string, folder: string): void {
  const canonical = fs.realpathSync(folder)
  const registry = readRegistry()
  for (const [existingId, existingFolder] of Object.entries(registry.projects)) {
    if (existingId !== projectId && path.normalize(existingFolder).toLowerCase() === path.normalize(canonical).toLowerCase()) {
      throw new Error('Folder is already assigned to another project')
    }
  }
  registry.projects[projectId] = canonical
  const target = getProjectRegistryPath()
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const temp = `${target}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temp, JSON.stringify(registry, null, 2), { flag: 'wx', mode: 0o600 })
    fs.renameSync(temp, target)
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp)
  }
  setProjectFolder(projectId, canonical)
}

export function registeredProjectFolder(projectId: string): string {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(projectId)) throw new Error('Invalid project ID')
  const folder = readRegistry().projects[projectId] ?? getProjectFolder(projectId)
  if (!folder || !fs.existsSync(folder)) throw new Error('Project folder is unavailable')
  const canonical = fs.realpathSync(folder)
  const manifest = JSON.parse(fs.readFileSync(resolveProjectPath(canonical, '.hyper-studio/project.json'), 'utf8')) as { projectId?: string }
  if (manifest.projectId !== projectId) throw new Error('Project folder manifest does not match ID')
  return canonical
}

/** A missing folder can still be forgotten; only a validated managed folder can be trashed. */
export function projectFolderRecord(projectId: string): string | null {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(projectId)) throw new Error('Invalid project ID')
  return readRegistry().projects[projectId] ?? getProjectFolder(projectId) ?? null
}

export function allProjectFolderRecords(): Array<{ projectId: string; folder: string }> {
  return [
    ...Object.entries(readRegistry().projects).map(([projectId, folder]) => ({ projectId, folder })),
    ...Object.entries(readAppState().projectFolders ?? {}).map(([projectId, folder]) => ({ projectId, folder })),
  ]
}

export function unbindProject(projectId: string): void {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(projectId)) throw new Error('Invalid project ID')
  const registry = readRegistry()
  if (registry.projects[projectId]) {
    delete registry.projects[projectId]
    const target = getProjectRegistryPath()
    const temp = `${target}.${randomUUID()}.tmp`
    try {
      fs.writeFileSync(temp, JSON.stringify(registry, null, 2), { flag: 'wx', mode: 0o600 })
      fs.renameSync(temp, target)
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp)
    }
  }
  removeProjectFolder(projectId)
}

export function getSharedStorageRoot(): string | null {
  const file = path.join(app.getPath('userData'), 'shared_storage.json')
  if (!fs.existsSync(file)) return null
  const value = JSON.parse(fs.readFileSync(file, 'utf8')) as { version: number; root: string }
  if (value.version !== 1 || typeof value.root !== 'string' || !fs.existsSync(value.root)) return null
  return fs.realpathSync(value.root)
}

export function setSharedStorageRoot(folder: string): string {
  if (!path.isAbsolute(folder)) throw new Error('Storage folder must be absolute')
  fs.mkdirSync(folder, { recursive: true })
  const root = fs.realpathSync(folder)
  for (const name of ['models', 'runtimes', 'caches']) fs.mkdirSync(path.join(root, name), { recursive: true })
  const file = path.join(app.getPath('userData'), 'shared_storage.json')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temp, JSON.stringify({ version: 1, root }, null, 2), { flag: 'wx', mode: 0o600 })
    fs.renameSync(temp, file)
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp)
  }
  return root
}

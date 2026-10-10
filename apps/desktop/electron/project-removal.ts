import fs from 'node:fs'
import path from 'node:path'

function contains(outer: string, inner: string): boolean {
  const relative = path.relative(outer, inner)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

function sameOrAncestor(left: string, right: string): boolean {
  return contains(left, right) || contains(right, left)
}

export function validateProjectTrashTarget(input: {
  projectId: string
  folder: string
  sharedRoot: string | null
  userData: string
  registeredFolders: Array<{ projectId: string; folder: string }>
}): string {
  const { projectId, sharedRoot, userData, registeredFolders } = input
  const folder = path.resolve(input.folder)
  if (folder === path.parse(folder).root) throw new Error('Cannot trash a drive root')
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) throw new Error('Project folder is unavailable')
  let segment = path.parse(folder).root
  for (const part of path.relative(segment, folder).split(path.sep).filter(Boolean)) {
    segment = path.join(segment, part)
    if (fs.lstatSync(segment).isSymbolicLink()) throw new Error('Cannot trash a symbolic-link project folder')
  }
  const canonical = fs.realpathSync(folder)
  if (canonical !== folder) throw new Error('Project folder path changed')
  if (sharedRoot && sameOrAncestor(canonical, fs.realpathSync(sharedRoot))) {
    throw new Error('Project folder overlaps shared storage')
  }
  if (sameOrAncestor(canonical, path.resolve(userData))) throw new Error('Project folder overlaps app data')
  for (const other of registeredFolders) {
    if (other.projectId !== projectId && contains(canonical, path.resolve(other.folder))) {
      throw new Error('Project folder contains another registered project')
    }
  }
  const metadataPath = path.join(canonical, '.hyper-studio')
  if (!fs.existsSync(metadataPath) || fs.lstatSync(metadataPath).isSymbolicLink()) {
    throw new Error('Only managed project folders can be trashed')
  }
  const manifestPath = path.join(metadataPath, 'project.json')
  if (!fs.existsSync(manifestPath) || fs.lstatSync(manifestPath).isSymbolicLink()) {
    throw new Error('Only managed project folders can be trashed')
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { version?: number; projectId?: string }
  if (manifest.version !== 1 || manifest.projectId !== projectId) {
    throw new Error('Project folder manifest does not match ID')
  }
  return canonical
}

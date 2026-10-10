import type { Asset } from '../types/project-model'

export interface WorkspaceMediaItem {
  id: string
  relativePath: string
  absolutePath: string
  kind: 'video' | 'image' | 'audio' | 'other'
  createdAt: number
}

function comparablePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

/** Only paths already inside the selected project can be registered in its media index. */
export function projectRelativePath(projectFolder: string, absolutePath: string): string | null {
  const root = comparablePath(projectFolder)
  const candidate = comparablePath(absolutePath)
  if (!candidate.startsWith(`${root}/`)) return null
  const relative = absolutePath.replace(/\\/g, '/').slice(root.length + 1)
  if (!relative || relative.split('/').some(part => part === '..' || part === '.')) return null
  return relative
}

/** Reflect files made in Workflow mode in the Editor bin without changing existing asset IDs. */
export function mergeWorkspaceMedia(assets: Asset[], entries: WorkspaceMediaItem[]): Asset[] {
  const knownPaths = new Set(assets.map(asset => comparablePath(asset.path)))
  const additions: Asset[] = []
  for (const entry of entries) {
    if (entry.kind === 'other' || knownPaths.has(comparablePath(entry.absolutePath))) continue
    knownPaths.add(comparablePath(entry.absolutePath))
    additions.push({
      id: `workspace-${entry.id}`,
      type: entry.kind,
      path: entry.absolutePath,
      prompt: '',
      resolution: '',
      createdAt: entry.createdAt,
    })
  }
  return additions.length ? [...additions, ...assets] : assets
}

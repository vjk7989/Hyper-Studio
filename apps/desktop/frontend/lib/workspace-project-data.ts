import type { WorkspaceManifest } from '../../shared/electron-api-schema'
import { createDefaultTimeline, normalizeProject, type Project } from '../types/project-model.ts'
import { projectRelativePath } from './workspace-media.ts'

const MEDIA_PATH_KEYS = new Set(['path', 'bigThumbnailPath', 'smallThumbnailPath', 'videoPath', 'inputImageUrl', 'inputLastImageUrl', 'inputAudioUrl', 'retakeVideoPath', 'extendVideoPath', 'icLoraVideoPath'])

function mapMediaPaths(value: unknown, folder: string, direction: 'store' | 'open'): unknown {
  if (Array.isArray(value)) return value.map(item => mapMediaPaths(item, folder, direction))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (MEDIA_PATH_KEYS.has(key) && typeof item === 'string') {
      if (direction === 'store') return [key, projectRelativePath(folder, item) ?? item]
      if (!/^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(item) && !item.split(/[\\/]/).includes('..')) {
        return [key, `${folder.replace(/[\\/]$/, '')}/${item.replace(/\\/g, '/')}`]
      }
    }
    return [key, mapMediaPaths(item, folder, direction)]
  }))
}

export function prepareWorkspaceProject(project: Project): unknown {
  if (!project.projectFolder) return project
  const { projectFolder, ...data } = project
  return mapMediaPaths(data, projectFolder, 'store')
}

export function restoreWorkspaceProject(data: unknown, folder: string): unknown {
  return mapMediaPaths(data, folder, 'open')
}

/** The folder manifest and editor.json win over a stale localStorage listing on reopen. */
export function hydrateProjectFromWorkspace(manifest: WorkspaceManifest, folder: string, rawData: unknown, cached: Project | null): Project {
  const defaultTimeline = createDefaultTimeline('Timeline 1')
  const base = rawData ? normalizeProject(restoreWorkspaceProject(rawData, folder)) : cached ?? normalizeProject({
    id: manifest.projectId,
    name: manifest.name,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
    assets: [],
    timelines: [defaultTimeline],
    activeTimelineId: defaultTimeline.id,
  })
  return normalizeProject({
    ...base,
    id: manifest.projectId,
    name: manifest.name,
    projectFolder: folder,
    workspaceMode: manifest.mode,
    createdAt: manifest.createdAt,
  })
}

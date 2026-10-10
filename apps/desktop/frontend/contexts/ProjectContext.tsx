import React, { createContext, useCallback, useContext, useState } from 'react'
import type { WorkspaceManifest, WorkspaceMediaEntry } from '../../shared/electron-api-schema'
import { hasLegacyProjectsEntry } from '../hooks/useProjectReferencesMigration'
import { createDefaultTimeline, normalizeProject, type Project, type Asset, type AssetTake, type ProjectTab } from '../types/project-model'
import { removeRecentProjectId } from '../lib/home-recent-projects-preference.ts'
import {
  deleteProjectEntry,
  readProject,
  readProjectIds,
  writeProject,
  writeProjectIds,
} from '../lib/project-storage'
import { mergeWorkspaceMedia, projectRelativePath } from '../lib/workspace-media'
import { hydrateProjectFromWorkspace, prepareWorkspaceProject } from '../lib/workspace-project-data'

interface ProjectContextType {
  currentTab: ProjectTab
  setCurrentTab: (tab: ProjectTab) => void

  projectIds: string[]
  activeProject: Project | null
  getProject: (id: string) => Project | null
  setProject: (id: string, project: Project) => void
  updateWorkspaceMode: (id: string, mode: 'editor' | 'workflow') => void
  createProject: (name: string, projectFolder?: string, workspaceMode?: 'editor' | 'workflow') => Project
  openProjectWorkspace: (id: string) => Promise<Project | null>
  registerWorkspaceProject: (manifest: WorkspaceManifest, folder: string) => Promise<Project>
  workspaceMedia: WorkspaceMediaEntry[]
  generationProjectId: string | null
  selectGenerationProject: (id: string) => Promise<void>
  workspaceOpenStatus: 'idle' | 'opening' | 'ready' | 'error'
  workspaceOpenError: string | null
  workspaceSaveError: string | null
  deleteProject: (id: string) => void
  removeProject: (id: string, mode: 'forget' | 'trash') => Promise<void>
  renameProject: (id: string, name: string) => void
  activateProject: (id: string) => void
  clearActiveProject: () => void
  reloadProjectIds: () => void

  addAsset: (projectId: string, asset: Omit<Asset, 'id' | 'createdAt'>) => Asset
  deleteAsset: (projectId: string, assetId: string) => void
  updateAsset: (projectId: string, assetId: string, updates: Partial<Asset>) => void
  addTakeToAsset: (projectId: string, assetId: string, take: AssetTake) => void
  deleteTakeFromAsset: (projectId: string, assetId: string, takeIndex: number) => void
  setAssetActiveTake: (projectId: string, assetId: string, takeIndex: number) => void
  toggleFavorite: (projectId: string, assetId: string) => void

  genSpaceEditImagePath: string | null
  setGenSpaceEditImagePath: (path: string | null) => void
  genSpaceEditMode: 'image' | 'video' | null
  setGenSpaceEditMode: (mode: 'image' | 'video' | null) => void
  genSpaceAudioPath: string | null
  setGenSpaceAudioPath: (path: string | null) => void
  genSpaceRetakeSource: GenSpaceRetakeSource | null
  setGenSpaceRetakeSource: (source: GenSpaceRetakeSource | null) => void
  pendingRetakeUpdate: PendingRetakeUpdate | null
  setPendingRetakeUpdate: (update: PendingRetakeUpdate | null) => void
  genSpaceIcLoraSource: GenSpaceIcLoraSource | null
  setGenSpaceIcLoraSource: (source: GenSpaceIcLoraSource | null) => void
  pendingIcLoraUpdate: PendingIcLoraUpdate | null
  setPendingIcLoraUpdate: (update: PendingIcLoraUpdate | null) => void
}

export interface GenSpaceRetakeSource {
  videoPath: string
  clipId?: string
  assetId?: string
  linkedClipIds?: string[]
  duration?: number
}

export interface PendingRetakeUpdate {
  assetId: string
  clipIds: string[]
  newTakeIndex: number
}

export interface GenSpaceIcLoraSource {
  videoPath: string
  clipId?: string
  assetId?: string
  linkedClipIds?: string[]
}

export interface PendingIcLoraUpdate {
  assetId: string
  clipIds: string[]
  newTakeIndex: number
}

const ProjectContext = createContext<ProjectContextType | null>(null)

function loadInitialProjectIds(): string[] {
  if (hasLegacyProjectsEntry()) return []
  return readProjectIds()
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentTab, setCurrentTab] = useState<ProjectTab>('gen-space')
  const [projectIds, setProjectIds] = useState<string[]>(() => loadInitialProjectIds())
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [projectRevision, setProjectRevision] = useState(0)
  const [workspaceMedia, setWorkspaceMedia] = useState<WorkspaceMediaEntry[]>([])
  const [generationProjectId, setGenerationProjectId] = useState<string | null>(null)
  const [workspaceOpenStatus, setWorkspaceOpenStatus] = useState<'idle' | 'opening' | 'ready' | 'error'>('idle')
  const [workspaceOpenError, setWorkspaceOpenError] = useState<string | null>(null)
  const [workspaceSaveError, setWorkspaceSaveError] = useState<string | null>(null)
  const [genSpaceEditImagePath, setGenSpaceEditImagePath] = useState<string | null>(null)
  const [genSpaceEditMode, setGenSpaceEditMode] = useState<'image' | 'video' | null>(null)
  const [genSpaceAudioPath, setGenSpaceAudioPath] = useState<string | null>(null)
  const [genSpaceRetakeSource, setGenSpaceRetakeSource] = useState<GenSpaceRetakeSource | null>(null)
  const [pendingRetakeUpdate, setPendingRetakeUpdate] = useState<PendingRetakeUpdate | null>(null)
  const [genSpaceIcLoraSource, setGenSpaceIcLoraSource] = useState<GenSpaceIcLoraSource | null>(null)
  const [pendingIcLoraUpdate, setPendingIcLoraUpdate] = useState<PendingIcLoraUpdate | null>(null)

  const bumpProjectRevision = useCallback(() => {
    setProjectRevision(prev => prev + 1)
  }, [])

  const getProject = useCallback((id: string): Project | null => readProject(id), [projectRevision])

  const reloadProjectIds = useCallback(() => {
    const nextProjectIds = hasLegacyProjectsEntry() ? [] : readProjectIds()
    setProjectIds(nextProjectIds)
    setActiveProject(prev => (
      prev && nextProjectIds.includes(prev.id) ? prev : null
    ))
    bumpProjectRevision()
  }, [bumpProjectRevision])

  const writeQueues = React.useRef(new Map<string, Promise<unknown>>())
  const registeredMedia = React.useRef(new Set<string>())

  const queueWorkspaceWrite = useCallback((project: Project) => {
    if (!project.projectFolder) return
    const previous = writeQueues.current.get(project.id) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(async () => {
      const saved = await window.electronAPI.writeWorkspaceProjectData({ projectId: project.id, project: prepareWorkspaceProject(project) })
      if (!saved) throw new Error('The project workspace refused to save the editor state.')
      setWorkspaceSaveError(null)
    })
    writeQueues.current.set(project.id, next)
    void next.catch(error => setWorkspaceSaveError(error instanceof Error ? error.message : String(error)))
  }, [])

  const persistProject = useCallback((projectId: string, project: Project): Project => {
    const persistedProject = writeProject(projectId, normalizeProject({ ...project, id: projectId }))
    setActiveProject(prev => (prev?.id === projectId ? persistedProject : prev))
    bumpProjectRevision()
    queueWorkspaceWrite(persistedProject)
    if (persistedProject.projectFolder) {
      for (const asset of persistedProject.assets) {
        const relativePath = projectRelativePath(persistedProject.projectFolder, asset.path)
        if (!relativePath || registeredMedia.current.has(`${projectId}:${relativePath}`)) continue
        registeredMedia.current.add(`${projectId}:${relativePath}`)
        void window.electronAPI.registerWorkspaceMedia({ projectId, relativePath, kind: asset.type === 'adjustment' ? 'other' : asset.type, origin: 'editor' })
          .catch(() => registeredMedia.current.delete(`${projectId}:${relativePath}`))
      }
    }
    return persistedProject
  }, [bumpProjectRevision, queueWorkspaceWrite])

  const registerWorkspaceProject = useCallback(async (manifest: WorkspaceManifest, folder: string): Promise<Project> => {
    const rawData = await window.electronAPI.readWorkspaceProjectData({ projectId: manifest.projectId })
    const cached = readProject(manifest.projectId)
    const authoritative = hydrateProjectFromWorkspace(manifest, folder, rawData, cached)
    persistProject(manifest.projectId, authoritative)
    const nextIds = [manifest.projectId, ...readProjectIds().filter(id => id !== manifest.projectId)]
    writeProjectIds(nextIds)
    setProjectIds(nextIds)
    setActiveProject(authoritative)
    setWorkspaceOpenStatus('ready')
    setWorkspaceOpenError(null)
    setGenerationProjectId(manifest.projectId)
    bumpProjectRevision()
    return authoritative
  }, [bumpProjectRevision, persistProject])

  const openProjectWorkspace = useCallback(async (id: string): Promise<Project | null> => {
    setWorkspaceOpenStatus('opening')
    setWorkspaceOpenError(null)
    const cached = readProject(id)
    if (!cached?.projectFolder) {
      setActiveProject(cached)
      setWorkspaceOpenStatus('ready')
      return cached
    }
    try {
      const manifest = await window.electronAPI.openWorkspaceProject({ folder: cached.projectFolder })
      if (manifest.projectId !== id) throw new Error('The selected folder belongs to another project.')
      return await registerWorkspaceProject(manifest, cached.projectFolder)
    } catch (error) {
      setWorkspaceOpenStatus('error')
      setWorkspaceOpenError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }, [registerWorkspaceProject])

  const activateProject = useCallback((id: string) => {
    const cached = readProject(id)
    if (!cached?.projectFolder) {
      setActiveProject(cached)
      setWorkspaceOpenStatus('ready')
      return
    }
    setGenerationProjectId(id)
    setActiveProject(null)
    void openProjectWorkspace(id).catch(error => console.error('Could not open project workspace', error))
  }, [openProjectWorkspace])

  const selectGenerationProject = useCallback(async (id: string) => {
    const project = readProject(id)
    if (!project?.projectFolder) throw new Error('Choose a project with a workspace folder or import this legacy project first.')
    await openProjectWorkspace(id)
    setGenerationProjectId(id)
  }, [openProjectWorkspace])

  const clearActiveProject = useCallback(() => {
    setActiveProject(null)
  }, [])

  const mutateProject = useCallback((projectId: string, updater: (project: Project) => Project): Project | null => {
    const project = readProject(projectId)
    if (!project) return null
    return persistProject(projectId, updater(project))
  }, [persistProject])

  const setProject = useCallback((projectId: string, project: Project) => {
    persistProject(projectId, project)
  }, [persistProject])

  const updateWorkspaceMode = useCallback((projectId: string, mode: 'editor' | 'workflow') => {
    mutateProject(projectId, project => ({ ...project, workspaceMode: mode, updatedAt: Date.now() }))
  }, [mutateProject])

  const createProject = useCallback((name: string, projectFolder?: string, workspaceMode: 'editor' | 'workflow' = 'editor'): Project => {
    const defaultTimeline = createDefaultTimeline('Timeline 1')
    const newProject = normalizeProject({
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      projectFolder,
      workspaceMode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      assets: [],
      timelines: [defaultTimeline],
      activeTimelineId: defaultTimeline.id,
    })

    const persistedProject = writeProject(newProject.id, newProject)
    const nextProjectIds = [persistedProject.id, ...readProjectIds().filter(id => id !== persistedProject.id)]
    writeProjectIds(nextProjectIds)
    setProjectIds(nextProjectIds)
    bumpProjectRevision()
    return persistedProject
  }, [bumpProjectRevision])

  React.useEffect(() => {
    const projectId = activeProject?.id
    if (!projectId || !activeProject.projectFolder) {
      setWorkspaceMedia([])
      return
    }
    let disposed = false
    const refresh = (entries: WorkspaceMediaEntry[]) => {
      if (disposed) return
      setWorkspaceMedia(entries)
      const current = readProject(projectId)
      if (!current) return
      const assets = mergeWorkspaceMedia(current.assets, entries)
      if (assets !== current.assets) persistProject(projectId, { ...current, assets, updatedAt: Date.now() })
    }
    void window.electronAPI.listWorkspaceMedia({ projectId }).then(refresh).catch(() => undefined)
    void window.electronAPI.watchWorkspaceMedia({ projectId }).catch(() => undefined)
    const unsubscribe = window.electronAPI.onWorkspaceMediaChanged(event => {
      if (event.projectId === projectId) refresh(event.entries)
    })
    return () => {
      disposed = true
      unsubscribe()
      void window.electronAPI.unwatchWorkspaceMedia({ projectId }).catch(() => undefined)
    }
  }, [activeProject?.id, activeProject?.projectFolder, persistProject])

  const forgetProjectLocally = useCallback((id: string) => {
    writeQueues.current.delete(id)
    for (const key of registeredMedia.current) {
      if (key.startsWith(`${id}:`)) registeredMedia.current.delete(key)
    }
    setWorkspaceMedia(prev => activeProject?.id === id || generationProjectId === id ? [] : prev)
    const nextProjectIds = readProjectIds().filter(projectId => projectId !== id)
    writeProjectIds(nextProjectIds)
    setProjectIds(nextProjectIds)
    deleteProjectEntry(id)
    removeRecentProjectId(id)
    setActiveProject(prev => (prev?.id === id ? null : prev))
    setGenerationProjectId(prev => (prev === id ? null : prev))
    bumpProjectRevision()
  }, [activeProject?.id, generationProjectId, bumpProjectRevision])

  const deleteProject = useCallback((id: string) => {
    // Only used to roll back a local create before it becomes visible.
    forgetProjectLocally(id)
  }, [forgetProjectLocally])

  const removeProject = useCallback(async (id: string, mode: 'forget' | 'trash') => {
    const project = readProject(id)
    if (!project) throw new Error('This project is no longer available.')
    if (mode === 'trash' && !project.projectFolder) {
      throw new Error('Legacy projects have no managed folder to move to Trash.')
    }
    await writeQueues.current.get(id)
    await window.electronAPI.removeWorkspaceProject({ projectId: id, mode })
    forgetProjectLocally(id)
  }, [forgetProjectLocally])

  const renameProject = useCallback((id: string, name: string) => {
    mutateProject(id, project => ({
      ...project,
      name,
      updatedAt: Date.now(),
    }))
  }, [mutateProject])

  const addAsset = useCallback((projectId: string, assetData: Omit<Asset, 'id' | 'createdAt'>): Asset => {
    const newAsset: Asset = {
      ...assetData,
      id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    }

    mutateProject(projectId, project => ({
      ...project,
      assets: [newAsset, ...project.assets],
      updatedAt: Date.now(),
    }))

    return newAsset
  }, [mutateProject])

  const deleteAsset = useCallback((projectId: string, assetId: string) => {
    mutateProject(projectId, project => ({
      ...project,
      assets: project.assets.filter(asset => asset.id !== assetId),
      updatedAt: Date.now(),
    }))
  }, [mutateProject])

  const updateAsset = useCallback((projectId: string, assetId: string, updates: Partial<Asset>) => {
    mutateProject(projectId, project => ({
      ...project,
      assets: project.assets.map(asset => (
        asset.id === assetId ? { ...asset, ...updates } : asset
      )),
      updatedAt: Date.now(),
    }))
  }, [mutateProject])

  const addTakeToAsset = useCallback((projectId: string, assetId: string, take: AssetTake) => {
    mutateProject(projectId, project => ({
      ...project,
      assets: project.assets.map(asset => {
        if (asset.id !== assetId) return asset

        const existingTakes: AssetTake[] = asset.takes || [{
          path: asset.path,
          bigThumbnailPath: asset.bigThumbnailPath,
          smallThumbnailPath: asset.smallThumbnailPath,
          width: asset.width,
          height: asset.height,
          createdAt: asset.createdAt,
        }]
        const newTakes = [...existingTakes, take]
        const newIndex = newTakes.length - 1

        return {
          ...asset,
          takes: newTakes,
          activeTakeIndex: newIndex,
          path: take.path,
          bigThumbnailPath: take.bigThumbnailPath,
          smallThumbnailPath: take.smallThumbnailPath,
          width: take.width,
          height: take.height,
        }
      }),
      updatedAt: Date.now(),
    }))
  }, [mutateProject])

  const deleteTakeFromAsset = useCallback((projectId: string, assetId: string, takeIndex: number) => {
    mutateProject(projectId, project => ({
      ...project,
      assets: project.assets.map(asset => {
        if (asset.id !== assetId || !asset.takes || asset.takes.length <= 1) return asset

        const newTakes = asset.takes.filter((_, index) => index !== takeIndex)
        let newActiveIdx = asset.activeTakeIndex ?? newTakes.length - 1
        if (newActiveIdx >= newTakes.length) newActiveIdx = newTakes.length - 1
        if (newActiveIdx < 0) newActiveIdx = 0
        const activeTake = newTakes[newActiveIdx]

        return {
          ...asset,
          takes: newTakes,
          activeTakeIndex: newActiveIdx,
          path: activeTake.path,
          bigThumbnailPath: activeTake.bigThumbnailPath,
          smallThumbnailPath: activeTake.smallThumbnailPath,
          width: activeTake.width,
          height: activeTake.height,
        }
      }),
      updatedAt: Date.now(),
    }))
  }, [mutateProject])

  const setAssetActiveTake = useCallback((projectId: string, assetId: string, takeIndex: number) => {
    mutateProject(projectId, project => ({
      ...project,
      assets: project.assets.map(asset => {
        if (asset.id !== assetId || !asset.takes) return asset

        const nextIndex = Math.max(0, Math.min(takeIndex, asset.takes.length - 1))
        const take = asset.takes[nextIndex]

        return {
          ...asset,
          activeTakeIndex: nextIndex,
          path: take.path,
          bigThumbnailPath: take.bigThumbnailPath,
          smallThumbnailPath: take.smallThumbnailPath,
          width: take.width,
          height: take.height,
        }
      }),
      updatedAt: Date.now(),
    }))
  }, [mutateProject])

  const toggleFavorite = useCallback((projectId: string, assetId: string) => {
    mutateProject(projectId, project => ({
      ...project,
      assets: project.assets.map(asset => (
        asset.id === assetId ? { ...asset, favorite: !asset.favorite } : asset
      )),
      updatedAt: Date.now(),
    }))
  }, [mutateProject])

  return (
    <ProjectContext.Provider value={{
      currentTab,
      setCurrentTab,
      projectIds,
      activeProject,
      getProject,
      setProject,
      updateWorkspaceMode,
      createProject,
      openProjectWorkspace,
      registerWorkspaceProject,
      workspaceMedia,
      generationProjectId,
      selectGenerationProject,
      workspaceOpenStatus,
      workspaceOpenError,
      workspaceSaveError,
      deleteProject,
      removeProject,
      renameProject,
      activateProject,
      clearActiveProject,
      reloadProjectIds,
      addAsset,
      deleteAsset,
      updateAsset,
      addTakeToAsset,
      deleteTakeFromAsset,
      setAssetActiveTake,
      toggleFavorite,
      genSpaceEditImagePath,
      setGenSpaceEditImagePath,
      genSpaceEditMode,
      setGenSpaceEditMode,
      genSpaceAudioPath,
      setGenSpaceAudioPath,
      genSpaceRetakeSource,
      setGenSpaceRetakeSource,
      pendingRetakeUpdate,
      setPendingRetakeUpdate,
      genSpaceIcLoraSource,
      setGenSpaceIcLoraSource,
      pendingIcLoraUpdate,
      setPendingIcLoraUpdate,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjects() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider')
  }
  return context
}

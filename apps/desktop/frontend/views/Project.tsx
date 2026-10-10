import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Sparkles, Film, Workflow } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { Text } from '@ds/Text/Text'
import { useProjects } from '../contexts/ProjectContext'
import { recordRecentProjectId } from '../lib/home-recent-projects-preference'
import { decideProjectRoute } from '../lib/project-navigation'
import { paths } from '../paths'
import { GenSpace } from './GenSpace'
import { VideoEditor } from './VideoEditor'
import { WorkflowWorkspace } from './WorkflowWorkspace'
import { ProjectConnectionPicker } from '../components/ProjectConnectionPicker'
import { ProviderJobComposer } from '../components/ProviderJobComposer'
import { readProject } from '../lib/project-storage'
import type { ProjectTab } from '../types/project-model'
import {
  visualAssetMetadataMigrationKey,
  runVisualAssetMetadataMigration,
} from '../lib/project-asset-metadata-migration'
import styles from './Project.module.scss'

export function Project() {
  const { projectId } = useParams()
  const {
    activeProject,
    currentTab,
    getProject,
    activateProject,
    clearActiveProject,
    setProject,
    updateWorkspaceMode,
    setCurrentTab,
    updateAsset,
    workspaceMedia,
    workspaceOpenStatus,
    workspaceOpenError,
    workspaceSaveError,
    pendingRetakeUpdate,
    setPendingRetakeUpdate,
    pendingIcLoraUpdate,
    setPendingIcLoraUpdate,
  } = useProjects()
  const resolvedProject = projectId ? getProject(projectId) : null
  const decision = decideProjectRoute({
    projectId,
    activeProjectId: activeProject?.id ?? null,
    projectExists: resolvedProject !== null,
  })
  const [assetMetadataMigrationProgress, setAssetMetadataMigrationProgress] = useState({ running: false, total: 0, completed: 0 })
  const [showProviderJobComposer, setShowProviderJobComposer] = useState(false)
  const workspaceMode = activeProject?.workspaceMode ?? 'editor'
  const setWorkspaceMode = useCallback((mode: 'editor' | 'workflow') => {
    if (!activeProject) return
    updateWorkspaceMode(activeProject.id, mode)
  }, [activeProject, updateWorkspaceMode])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.altKey || event.key.toLowerCase() !== 'm') return
      if ((event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      setWorkspaceMode(workspaceMode === 'editor' ? 'workflow' : 'editor')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setWorkspaceMode, workspaceMode])

  useLayoutEffect(() => {
    if (decision !== 'activate' || !projectId) return
    recordRecentProjectId(projectId)
    activateProject(projectId)
  }, [activateProject, decision, projectId])

  useLayoutEffect(() => {
    return () => clearActiveProject()
  }, [clearActiveProject])
  const [upgradePassProjectId, setUpgradePassProjectId] = useState<string | null>(null)
  const activeProjectId = activeProject?.id ?? null
  const activeProjectAssets = activeProject?.assets ?? null
  const migrationKey = activeProjectAssets
    ? visualAssetMetadataMigrationKey(activeProjectAssets)
    : '[]'
  const needsAssetMetadataMigration = migrationKey !== '[]'
  const migrationAssetsRef = useRef(activeProjectAssets)
  migrationAssetsRef.current = activeProjectAssets
  const attemptedMigrationRef = useRef<{ projectId: string; key: string } | null>(null)

  const handleSaveActiveProject = useCallback((project: typeof activeProject extends null ? never : NonNullable<typeof activeProject>) => {
    if (!activeProjectId) return
    const latest = readProject(activeProjectId)
    if (!latest) return
    const editorAssetIds = new Set(project.assets.map(asset => asset.id))
    const newWorkspaceAssets = latest.assets.filter(asset => asset.id.startsWith('workspace-') && !editorAssetIds.has(asset.id))
    setProject(activeProjectId, {
      ...latest,
      bins: project.bins,
      assets: [...newWorkspaceAssets, ...project.assets],
      timelines: project.timelines,
      activeTimelineId: project.activeTimelineId,
      updatedAt: Date.now(),
    })
  }, [activeProjectId, setProject])

  useEffect(() => {
    const assets = migrationAssetsRef.current
    if (!activeProjectId || !assets || !needsAssetMetadataMigration) return
    if (attemptedMigrationRef.current?.projectId === activeProjectId && attemptedMigrationRef.current.key === migrationKey) return
    attemptedMigrationRef.current = { projectId: activeProjectId, key: migrationKey }

    let cancelled = false

    const runAssetMetadataMigration = async () => {
      for await (const event of runVisualAssetMetadataMigration(assets, window.electronAPI)) {
        if (cancelled) return

        if (event.kind === 'progress') {
          setAssetMetadataMigrationProgress({ running: true, total: event.total, completed: event.completed })
          continue
        }

        for (const update of event.updates) {
          updateAsset(activeProjectId, update.assetId, update.updates)
        }

        setAssetMetadataMigrationProgress({ running: false, total: 0, completed: 0 })
        setUpgradePassProjectId(activeProjectId)
      }
    }

    void runAssetMetadataMigration()

    return () => {
      cancelled = true
    }
  }, [activeProjectId, migrationKey, needsAssetMetadataMigration, updateAsset])

  useEffect(() => {
    if (currentTab !== 'video-editor') return
    if (pendingRetakeUpdate) setPendingRetakeUpdate(null)
    if (pendingIcLoraUpdate) setPendingIcLoraUpdate(null)
  }, [
    currentTab,
    pendingRetakeUpdate,
    setPendingRetakeUpdate,
    pendingIcLoraUpdate,
    setPendingIcLoraUpdate,
  ])

  if (decision === 'projects') {
    return <Navigate to={paths.projects} replace />
  }

  if (decision === 'activate' || !activeProject || activeProject.id !== projectId) {
    if (workspaceOpenStatus === 'error') return <div className={styles.migration}><div className={styles.migrationInner}><Text as="p" variant="body" size="lg">Could not open this project: {workspaceOpenError}</Text><button type="button" onClick={() => projectId && activateProject(projectId)}>Retry</button>{' '}<Link to={paths.projects}>Back to projects</Link></div></div>
    return <div className={styles.migration}><Text as="p" variant="body" size="lg">Opening project workspace...</Text></div>
  }

  const tabs: { id: ProjectTab; label: string; icon: ReactNode }[] = [
    { id: 'gen-space', label: 'Gen Space', icon: <Sparkles className={styles.tabIcon} /> },
    { id: 'video-editor', label: 'Video Editor', icon: <Film className={styles.tabIcon} /> },
  ]
  const shouldShowAssetMetadataMigrationProgressScreen = assetMetadataMigrationProgress.running
    || (upgradePassProjectId !== activeProjectId && needsAssetMetadataMigration)

  if (shouldShowAssetMetadataMigrationProgressScreen) {
    const progressPct = assetMetadataMigrationProgress.total > 0
      ? (assetMetadataMigrationProgress.completed / assetMetadataMigrationProgress.total) * 100
      : 0

    return (
      <div className={styles.migration}>
        <div className={styles.migrationInner}>
          <Text as="p" variant="body" size="lg" align="center" className={styles.migrationCopy}>
            Preparing your project assets...
          </Text>
          <div className={styles.migrationTrack}>
            <div
              className={styles.migrationFill}
              style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
            />
          </div>
        </div>
      </div>
    )
  }
  const isMac = window.electronAPI.platform === 'darwin'

  return (
    <div className={styles.root}>
      <header className={`${styles.header} ${isMac ? 'window-drag' : ''}`}>
        <div className={styles.titleSlot}>
          <Text as="span" variant="label" size="xl" shouldTruncate className={styles.title}>
            {activeProject.name}
          </Text>
        </div>

        <div className={`${styles.modeSwitch} window-no-drag`} aria-label="Workspace mode">
          <button type="button" aria-pressed={workspaceMode === 'editor'} className={`${styles.modeButton} ${workspaceMode === 'editor' ? styles.modeButtonSelected : ''}`} onClick={() => setWorkspaceMode('editor')} title="Editor mode (Ctrl/⌘+Shift+M)"><Film size={16} />Editor</button>
          <button type="button" aria-pressed={workspaceMode === 'workflow'} className={`${styles.modeButton} ${workspaceMode === 'workflow' ? styles.modeButtonSelected : ''}`} onClick={() => setWorkspaceMode('workflow')} title="Workflow mode (Ctrl/⌘+Shift+M)"><Workflow size={16} />Workflow</button>
        </div>

        <ProjectConnectionPicker project={activeProject} onChange={updates => setProject(activeProject.id, { ...activeProject, ...updates, updatedAt: Date.now() })} />
        <button type="button" className={`${styles.modeButton} window-no-drag`} onClick={() => setShowProviderJobComposer(value => !value)} aria-expanded={showProviderJobComposer}>Generate</button>

        {workspaceMode === 'editor' && <div className={styles.tabs} role="tablist" aria-label="Editor views">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={currentTab === tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`${styles.tab} ${currentTab === tab.id ? styles.tabSelected : ''} window-no-drag`}
            >
              {tab.icon}
              <Text as="span" variant="label" size="lg">
                {tab.label}
              </Text>
            </button>
          ))}
        </div>}

        <div className={styles.titleSlot} />
      </header>

      {showProviderJobComposer && <div className="max-h-[48vh] overflow-y-auto border-b border-separator p-3"><ProviderJobComposer projectId={activeProject.id} defaultProfileId={activeProject.defaultProfileId} defaultModelId={activeProject.defaultModelId} /></div>}

      <div className={styles.main}>
        {workspaceSaveError && <div role="alert" className={styles.deprecation}>Project changes could not be saved: {workspaceSaveError}</div>}
        {workspaceMode === 'workflow' ? (
          <WorkflowWorkspace project={activeProject} media={workspaceMedia} onSwitchToEditor={() => setWorkspaceMode('editor')} />
        ) : currentTab === 'gen-space' ? (
          <GenSpace />
        ) : (
          <VideoEditor
            key={activeProject.id}
            currentProject={activeProject}
            saveProject={handleSaveActiveProject}
            pendingRetakeUpdate={pendingRetakeUpdate}
            pendingIcLoraUpdate={pendingIcLoraUpdate}
          />
        )}
      </div>
    </div>
  )
}

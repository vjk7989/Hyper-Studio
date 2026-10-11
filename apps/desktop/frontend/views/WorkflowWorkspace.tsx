import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Blocks, Film, FolderOpen, RefreshCw, Workflow } from 'lucide-react'
import type { Project } from '../types/project-model'
import type { WorkspaceMediaEntry } from '../../shared/electron-api-schema'
import { pathToFileUrl } from '../lib/file-url'
import { trustedWorkflowCanvasUrl } from '../lib/workflow-canvas-url'
import styles from './Project.module.scss'

type EngineView = { state: 'stopped' | 'starting' | 'running' | 'failed'; url?: string; error?: string }

export function WorkflowWorkspace({ project, media, active, onSwitchToEditor }: { project: Project; media: WorkspaceMediaEntry[]; active: boolean; onSwitchToEditor: () => void }) {
  const [engine, setEngine] = useState<EngineView>({ state: 'starting' })
  const [showMedia, setShowMedia] = useState(false)
  const [readyFrame, setReadyFrame] = useState<{ projectId: string; url: string; requestId: string } | null>(null)
  const [workflowNames, setWorkflowNames] = useState<string[]>([])
  const [workflowName, setWorkflowName] = useState('workflow.json')
  const [fileError, setFileError] = useState<string | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const readinessRequest = useRef<string | null>(null)
  const start = useCallback(async () => {
    setEngine({ state: 'starting' })
    try { setEngine(await window.electronAPI.startWorkflowEngine({ projectId: project.id })) }
    catch (error) { setEngine({ state: 'failed', error: error instanceof Error ? error.message : 'Workflow engine could not start' }) }
  }, [project.id])

  useEffect(() => {
    let active = true
    setEngine({ state: 'starting' })
    void window.electronAPI.startWorkflowEngine({ projectId: project.id })
      .then(status => { if (active) setEngine(status) })
      .catch(error => { if (active) setEngine({ state: 'failed', error: error instanceof Error ? error.message : 'Workflow engine could not start' }) })
    const interval = window.setInterval(() => {
      void window.electronAPI.getWorkflowEngineStatus()
        .then(status => { if (active && (status.projectId === project.id || status.state !== 'running')) setEngine(status) })
        .catch(() => { if (active) setEngine({ state: 'failed', error: 'Workflow engine status is unavailable' }) })
    }, 3000)
    return () => { active = false; window.clearInterval(interval) }
  }, [project.id])

  const url = trustedWorkflowCanvasUrl(engine)
  const frameReady = !!url && readyFrame?.projectId === project.id && readyFrame.url === url && readyFrame.requestId === readinessRequest.current
  const requestCanvasReady = useCallback(() => {
    const target = frame.current?.contentWindow
    if (!url || !target) return
    const requestId = crypto.randomUUID()
    readinessRequest.current = requestId
    setReadyFrame(null)
    target.postMessage({ type: 'hyper-studio:canvas-ready-request', requestId }, new URL(url).origin)
  }, [url])
  useLayoutEffect(() => {
    readinessRequest.current = null
    setReadyFrame(null)
    if (!url) return
    const origin = new URL(url).origin
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== origin) return
      if (event.data?.type === 'hyper-studio:canvas-initialized') {
        requestCanvasReady()
      } else if (event.data?.type === 'hyper-studio:canvas-ready' && event.data.requestId === readinessRequest.current) {
        setReadyFrame({ projectId: project.id, url, requestId: event.data.requestId })
      } else if (event.data?.type === 'hyper-studio:canvas-unloading') {
        readinessRequest.current = null
        setReadyFrame(null)
      } else if (event.data?.type === 'hyper-studio:workflow-error') {
        setFileError(String(event.data.error || 'Could not open workflow'))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [project.id, requestCanvasReady, url])
  useEffect(() => {
    if (!url || !frameReady || !frame.current?.contentWindow) return
    frame.current.contentWindow.postMessage({ type: active ? 'hyper-studio:resume' : 'hyper-studio:suspend' }, new URL(url).origin)
  }, [active, frameReady, url])
  const refreshWorkflows = useCallback(async () => {
    setWorkflowNames(await window.electronAPI.listProjectWorkflows({ projectId: project.id }))
  }, [project.id])

  useEffect(() => { void refreshWorkflows().catch(() => setFileError('Could not list project workflows')) }, [refreshWorkflows])

  const sendOpen = useCallback((name: string, contents: string) => {
    if (!url || !frameReady || !frame.current?.contentWindow) throw new Error('Wait for the workflow canvas before opening a workflow')
    frame.current.contentWindow.postMessage({ type: 'hyper-studio:open-workflow', name, workflow: JSON.parse(contents) }, new URL(url).origin)
    setWorkflowName(name)
  }, [url, frameReady])

  const open = async () => {
    setFileError(null)
    try {
      const result = await window.electronAPI.openProjectWorkflow({ projectId: project.id, name: workflowName })
      sendOpen(result.name, result.contents)
    } catch (error) { setFileError(error instanceof Error ? error.message : 'Could not open workflow') }
  }

  const importFile = async () => {
    setFileError(null)
    try {
      const result = await window.electronAPI.importProjectWorkflow({ projectId: project.id })
      if (!result) return
      await refreshWorkflows()
      setWorkflowName(result.name)
      if (frameReady) sendOpen(result.name, result.contents)
    } catch (error) { setFileError(error instanceof Error ? error.message : 'Could not import workflow') }
  }

  const save = async () => {
    setFileError(null)
    if (!url || !frameReady || !frame.current?.contentWindow) { setFileError('Wait for the workflow canvas before saving'); return }
    const target = frame.current.contentWindow
    const origin = new URL(url).origin
    const requestId = crypto.randomUUID()
    try {
      const contents = await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => { window.removeEventListener('message', onMessage); reject(new Error('Canvas did not return a workflow')) }, 5000)
        const onMessage = (event: MessageEvent) => {
          if (event.source !== target || event.origin !== origin || event.data?.type !== 'hyper-studio:workflow-snapshot' || event.data?.requestId !== requestId) return
          window.clearTimeout(timeout)
          window.removeEventListener('message', onMessage)
          if (event.data.error) reject(new Error(String(event.data.error)))
          else resolve(JSON.stringify(event.data.workflow))
        }
        window.addEventListener('message', onMessage)
        target.postMessage({ type: 'hyper-studio:request-workflow', requestId }, origin)
      })
      await window.electronAPI.saveProjectWorkflow({ projectId: project.id, name: workflowName, contents })
      await refreshWorkflows()
    } catch (error) { setFileError(error instanceof Error ? error.message : 'Could not save workflow') }
  }

  const exportFile = async () => {
    setFileError(null)
    try { await window.electronAPI.exportProjectWorkflow({ projectId: project.id, name: workflowName }) }
    catch (error) { setFileError(error instanceof Error ? error.message : 'Could not export workflow') }
  }

  const openManager = () => {
    if (!url || !frameReady || !frame.current?.contentWindow) return
    frame.current.contentWindow.postMessage({ type: 'hyper-studio:open-manager' }, new URL(url).origin)
  }

  return (
    <div className={styles.workflowWorkspace}>
      <div className={styles.workflowToolbar}>
        <span className={styles.workflowPanelHeading}><Workflow size={18} aria-hidden="true" /> Workflow canvas</span>
        <input className={styles.workflowNameInput} aria-label="Workflow filename" value={workflowName} onChange={event => setWorkflowName(event.target.value)} list="project-workflow-names" />
        <datalist id="project-workflow-names">{workflowNames.map(name => <option key={name} value={name} />)}</datalist>
        <button type="button" className={styles.workflowMediaButton} onClick={() => void open()} disabled={!frameReady}>Open</button>
        <button type="button" className={styles.workflowMediaButton} onClick={() => void importFile()}><FolderOpen size={14} aria-hidden="true" /> Import</button>
        <button type="button" className={styles.workflowMediaButton} onClick={() => void save()} disabled={!frameReady}>Save</button>
        <button type="button" className={styles.workflowMediaButton} onClick={() => void exportFile()}>Export</button>
        <button type="button" className={styles.workflowMediaButton} onClick={openManager} disabled={!frameReady}><Blocks size={14} aria-hidden="true" /> Extensions</button>
        <button type="button" className={styles.workflowMediaButton} aria-expanded={showMedia} onClick={() => setShowMedia(value => !value)}>
          Shared files ({media.length})
        </button>
        <button type="button" className={styles.workflowEditorButton} onClick={onSwitchToEditor}><Film size={16} aria-hidden="true" /> Editor</button>
      </div>
      {fileError && <div className={styles.workflowFileError} role="alert">{fileError}</div>}
      <div className={styles.workflowCanvasRow}>
        {showMedia && <aside className={styles.workflowMediaPanel} aria-label="Shared project files">
          {media.length === 0 && <p className={styles.workflowDescription}>Generated and imported files will appear here in both modes.</p>}
          {media.map(item => <div className={styles.workflowMediaItem} key={item.id}>
            {item.kind === 'video' && <video src={pathToFileUrl(item.absolutePath)} controls preload="none" />}
            {item.kind === 'image' && <img src={pathToFileUrl(item.absolutePath)} alt="" loading="lazy" />}
            {item.kind === 'audio' && <audio src={pathToFileUrl(item.absolutePath)} controls preload="none" />}
            <span title={item.relativePath}>{item.relativePath.split(/[\\/]/).pop()}</span>
          </div>)}
        </aside>}
        {url ? (
          <iframe key={`${project.id}:${url}`} ref={frame} className={styles.workflowFrame} src={url} onLoad={requestCanvasReady} title="Hyper-Studio workflow canvas" referrerPolicy="no-referrer" />
        ) : (
          <div className={styles.workflowStatus} role={engine.state === 'failed' ? 'alert' : 'status'}>
            <Workflow size={30} aria-hidden="true" />
            <h1>{engine.state === 'failed' ? 'Workflow mode could not start' : 'Starting Workflow mode'}</h1>
            <p>{engine.state === 'failed' ? engine.error : 'Preparing the canvas for this project.'}</p>
            {engine.state === 'failed' && <button type="button" className={styles.workflowEditorButton} onClick={() => void start()}><RefreshCw size={16} aria-hidden="true" /> Retry</button>}
          </div>
        )}
      </div>
    </div>
  )
}

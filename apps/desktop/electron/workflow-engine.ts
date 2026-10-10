import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { randomBytes } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { app } from 'electron'
import { getSharedStorageRoot, registeredProjectFolder } from './project-registry'
import { startProviderJobBridge } from './provider-jobs/bridge'
import { prepareWorkflowPaths, workflowArguments, workflowCpuOnly } from './workflow-engine-config'
import { ensureWorkflowRuntime } from './workflow-runtime'

export type WorkflowEngineStatus = {
  state: 'stopped' | 'starting' | 'running' | 'failed'
  projectId?: string
  url?: string
  error?: string
}

let child: ChildProcess | null = null
let status: WorkflowEngineStatus = { state: 'stopped' }
let startPromise: Promise<WorkflowEngineStatus> | null = null
let revision = 0
let setupController: AbortController | null = null
const embedToken = randomBytes(32).toString('hex')

export function getWorkflowEmbedToken(): string { return embedToken }

function workflowSource(): string {
  const root = app.isPackaged ? path.join(process.resourcesPath, 'workflow-engine')
    : path.resolve(__dirname, '../../../services/workflow')
  if (!fs.existsSync(path.join(root, 'main.py'))) throw new Error('Workflow engine is not installed')
  return root
}

function workflowFrontend(): string {
  const root = app.isPackaged ? path.join(process.resourcesPath, 'workflow-frontend')
    : path.resolve(__dirname, '../../../apps/workflow-ui/dist')
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Workflow canvas is not built')
  return root
}

function workflowPython(sharedRoot: string): string | null {
  const executable = process.platform === 'win32' ? path.join('Scripts', 'python.exe') : path.join('bin', 'python3')
  const managed = path.join(sharedRoot, 'runtimes', 'workflow', '.venv', executable)
  if (fs.existsSync(managed)) return managed
  if (!app.isPackaged) {
    const local = path.join(workflowSource(), '.venv', executable)
    if (fs.existsSync(local)) return local
  }
  return null
}

async function freePort(): Promise<number> {
  const server = net.createServer()
  await new Promise<void>((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Cannot select workflow port')
  await new Promise<void>(resolve => server.close(() => resolve()))
  return address.port
}

function wait(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)) }

export function getWorkflowEngineStatus(): WorkflowEngineStatus { return { ...status } }

export async function stopWorkflowEngine(): Promise<WorkflowEngineStatus> {
  revision++
  setupController?.abort()
  setupController = null
  const running = child
  child = null
  status = { state: 'stopped' }
  if (running && running.exitCode === null && !running.killed) {
    running.kill()
    await Promise.race([
      new Promise<void>(resolve => running.once('exit', () => resolve())),
      wait(3000),
    ])
    if (running.exitCode === null) running.kill('SIGKILL')
  }
  return getWorkflowEngineStatus()
}

export async function startWorkflowEngine(projectId: string): Promise<WorkflowEngineStatus> {
  if (startPromise) await startPromise
  if (status.state === 'running' && status.projectId === projectId) return getWorkflowEngineStatus()
  startPromise = (async () => {
    await stopWorkflowEngine()
    const startedAtRevision = revision
    status = { state: 'starting', projectId }
    try {
      const project = registeredProjectFolder(projectId)
      const shared = getSharedStorageRoot()
      if (!shared) throw new Error('Choose a shared storage folder first')
      const paths = prepareWorkflowPaths(project, shared)
      const source = workflowSource()
      const frontend = workflowFrontend()
      // Packaged builds always validate the installation marker and pinned lock.
      // A partial first-run install can leave python.exe behind.
      let python = app.isPackaged ? null : workflowPython(shared)
      if (!python) {
        const controller = new AbortController()
        setupController = controller
        try { python = await ensureWorkflowRuntime(shared, controller.signal) }
        finally { if (setupController === controller) setupController = null }
      }
      if (revision !== startedAtRevision) return getWorkflowEngineStatus()
      const bridge = await startProviderJobBridge()
      const port = await freePort()
      if (revision !== startedAtRevision) return getWorkflowEngineStatus()
      const url = `http://127.0.0.1:${port}/`
      const env = {
          ...process.env,
          HYPER_STUDIO_PROJECT_ID: projectId,
          HYPER_STUDIO_JOB_BRIDGE_URL: bridge.url,
          HYPER_STUDIO_JOB_BRIDGE_TOKEN: bridge.token,
          HYPER_STUDIO_EMBED_TOKEN: embedToken,
          HOME: shared, USERPROFILE: shared,
          APPDATA: path.join(shared, 'caches', 'workflow', 'appdata'),
          LOCALAPPDATA: path.join(shared, 'caches', 'workflow', 'localappdata'),
          XDG_CONFIG_HOME: path.join(shared, 'caches', 'workflow', 'config'),
          XDG_DATA_HOME: path.join(shared, 'caches', 'workflow', 'data'),
          XDG_STATE_HOME: path.join(shared, 'caches', 'workflow', 'state'),
          TEMP: paths.processTemp, TMP: paths.processTemp, TMPDIR: paths.processTemp,
          XDG_CACHE_HOME: paths.cache,
          UV_CACHE_DIR: path.join(shared, 'caches', 'workflow', 'uv'),
          PIP_CACHE_DIR: path.join(shared, 'caches', 'workflow', 'pip'),
          HF_HUB_CACHE: path.join(shared, 'caches', 'huggingface'),
          HF_HOME: path.join(shared, 'caches', 'huggingface'),
          TORCH_HOME: path.join(shared, 'caches', 'torch'),
          PYTHONPYCACHEPREFIX: path.join(paths.cache, 'pycache'),
        }
      const cpuOnly = workflowCpuOnly(python, env)
      const engine = spawn(python, [path.join(source, 'main.py'), ...workflowArguments(paths, frontend, port), ...(cpuOnly ? ['--cpu'] : [])], {
        cwd: source, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore'], env,
      })
      child = engine
      let exited = false
      engine.once('exit', () => {
        exited = true
        if (child === engine) {
          child = null
          status = { state: 'failed', projectId, error: 'Workflow engine exited' }
        }
      })
      engine.once('error', () => { exited = true; if (child === engine) child = null })
      const deadline = Date.now() + 120000
      while (Date.now() < deadline && !exited && revision === startedAtRevision) {
        try {
          const response = await fetch(`${url}system_stats`, { signal: AbortSignal.timeout(1000), redirect: 'manual' })
          if (response.ok && !exited) {
            status = { state: 'running', projectId, url }
            return getWorkflowEngineStatus()
          }
        } catch { /* Startup can take several seconds. */ }
        await wait(250)
      }
      if (revision !== startedAtRevision) return getWorkflowEngineStatus()
      throw new Error(exited ? 'Workflow engine exited during startup' : 'Workflow engine did not become ready')
    } catch (error) {
      if (revision !== startedAtRevision) return getWorkflowEngineStatus()
      await stopWorkflowEngine()
      status = { state: 'failed', projectId, error: error instanceof Error ? error.message : 'Workflow engine failed to start' }
      return getWorkflowEngineStatus()
    }
  })()
  try { return await startPromise } finally { startPromise = null }
}

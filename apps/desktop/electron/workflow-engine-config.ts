import fs from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process'
import { resolveProjectPath } from './project-workspace.ts'

export type WorkflowLaunchPaths = {
  input: string
  output: string
  user: string
  temp: string
  database: string
  models: string
  cache: string
  extensions: string
  extraPathsConfig: string
  processTemp: string
}

export function prepareWorkflowPaths(projectFolder: string, sharedRoot: string): WorkflowLaunchPaths {
  const input = resolveProjectPath(projectFolder, 'assets')
  const output = resolveProjectPath(projectFolder, 'outputs')
  const user = resolveProjectPath(projectFolder, '.hyper-studio/workflow/user')
  const temp = resolveProjectPath(projectFolder, '.hyper-studio/workflow/temp')
  const database = resolveProjectPath(projectFolder, '.hyper-studio/workflow/workflow.db')
  const models = path.join(sharedRoot, 'models')
  const cache = path.join(sharedRoot, 'caches', 'workflow')
  const extensions = path.join(sharedRoot, 'extensions', 'workflow')
  const extraPathsConfig = path.join(cache, 'extra-paths.yaml')
  const processTemp = path.join(cache, 'tmp')
  for (const dir of [models, cache, extensions, processTemp]) {
    let current = fs.realpathSync(sharedRoot)
    for (const segment of path.relative(current, dir).split(path.sep).filter(Boolean)) {
      current = path.join(current, segment)
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Workflow storage path uses a symbolic link')
    }
  }
  for (const dir of [input, output, user, temp, models, cache, extensions, processTemp]) fs.mkdirSync(dir, { recursive: true })
  try {
    if (fs.lstatSync(extraPathsConfig).isSymbolicLink()) throw new Error('Workflow storage path uses a symbolic link')
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
  }
  const quoted = JSON.stringify(extensions.replaceAll('\\', '/'))
  fs.writeFileSync(extraPathsConfig, `hyper_studio:\n  is_default: true\n  custom_nodes: ${quoted}\n`, { mode: 0o600 })
  return { input, output, user, temp, database, models, cache, extensions, extraPathsConfig, processTemp }
}

export function workflowArguments(paths: WorkflowLaunchPaths, frontendRoot: string, port: number): string[] {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid workflow port')
  const dbPath = paths.database.replaceAll('\\', '/')
  return [
    '--listen', '127.0.0.1', '--port', String(port), '--disable-auto-launch',
    '--input-directory', paths.input, '--output-directory', paths.output,
    '--user-directory', paths.user, '--temp-directory', paths.temp,
    '--database-url', `sqlite:///${dbPath}`,
    '--models-directory', paths.models, '--front-end-root', frontendRoot,
    '--extra-model-paths-config', paths.extraPathsConfig, '--enable-manager',
  ]
}

type ProbeSpawn = (file: string, args: string[], options: SpawnOptions) => ChildProcess

function runtimeProbeKey(python: string): string {
  const realPath = fs.realpathSync(python)
  const interpreter = fs.statSync(realPath)
  // The managed runtime installer rewrites this marker after changing packages.
  // Include its contents so reinstalling PyTorch invalidates the process cache.
  const marker = path.resolve(python, '..', '..', '..', 'install.json')
  const installation = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8') : ''
  return `${realPath}:${interpreter.size}:${interpreter.mtimeMs}:${installation}`
}

export function createWorkflowCpuProbe(spawnProcess: ProbeSpawn = spawn) {
  const results = new Map<string, boolean>()
  return async (python: string, env: NodeJS.ProcessEnv, signal: AbortSignal): Promise<boolean> => {
    let key: string
    try { key = runtimeProbeKey(python) }
    catch { throw new Error('Workflow Python runtime cannot import PyTorch') }
    if (results.has(key)) return results.get(key) as boolean
    if (signal.aborted) throw new Error('Workflow Python probe cancelled')

    const cpuOnly = await new Promise<boolean>((resolve, reject) => {
      const failure = () => new Error('Workflow Python runtime cannot import PyTorch')
      let output = ''
      let settled = false
      let timer: ReturnType<typeof setTimeout> | undefined
      let process: ChildProcess
      const finish = (error?: Error, value?: boolean) => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        signal.removeEventListener('abort', onAbort)
        if (error) reject(error)
        else resolve(value as boolean)
      }
      const onAbort = () => {
        process.kill()
        finish(new Error('Workflow Python probe cancelled'))
      }
      try {
        process = spawnProcess(python, ['-c', "import torch; print('accelerated' if torch.cuda.is_available() or (hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()) else 'cpu')"], {
          env, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
        })
      } catch {
        finish(failure())
        return
      }
      process.stdout?.on('data', (chunk: Buffer) => { output = (output + chunk.toString('utf8')).slice(-128) })
      process.once('error', () => finish(failure()))
      process.once('close', code => {
        const result = output.trim()
        if (code !== 0 || (result !== 'cpu' && result !== 'accelerated')) finish(failure())
        else finish(undefined, result === 'cpu')
      })
      signal.addEventListener('abort', onAbort, { once: true })
      if (signal.aborted) { onAbort(); return }
      timer = setTimeout(() => {
        process.kill()
        finish(failure())
      }, 30000)
    })
    results.set(key, cpuOnly)
    return cpuOnly
  }
}

export const workflowCpuOnly = createWorkflowCpuProbe()

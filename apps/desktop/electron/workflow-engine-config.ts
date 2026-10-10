import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { resolveProjectPath } from './project-workspace.ts'

export type WorkflowLaunchPaths = {
  input: string
  output: string
  user: string
  temp: string
  database: string
  models: string
  cache: string
}

export function prepareWorkflowPaths(projectFolder: string, sharedRoot: string): WorkflowLaunchPaths {
  const input = resolveProjectPath(projectFolder, 'assets')
  const output = resolveProjectPath(projectFolder, 'outputs')
  const user = resolveProjectPath(projectFolder, '.hyper-studio/workflow/user')
  const temp = resolveProjectPath(projectFolder, '.hyper-studio/workflow/temp')
  const database = resolveProjectPath(projectFolder, '.hyper-studio/workflow/workflow.db')
  const models = path.join(sharedRoot, 'models')
  const cache = path.join(sharedRoot, 'caches', 'workflow')
  for (const dir of [models, cache]) {
    let current = fs.realpathSync(sharedRoot)
    for (const segment of path.relative(current, dir).split(path.sep).filter(Boolean)) {
      current = path.join(current, segment)
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Workflow storage path uses a symbolic link')
    }
  }
  for (const dir of [input, output, user, temp, models, cache]) fs.mkdirSync(dir, { recursive: true })
  return { input, output, user, temp, database, models, cache }
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
  ]
}

export function workflowCpuOnly(python: string, env: NodeJS.ProcessEnv): boolean {
  const script = "import torch; print('accelerated' if torch.cuda.is_available() or (hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()) else 'cpu')"
  const result = spawnSync(python, ['-c', script], { env, encoding: 'utf8', timeout: 30000, windowsHide: true })
  if (result.status !== 0) throw new Error('Workflow Python runtime cannot import PyTorch')
  return result.stdout.trim() === 'cpu'
}

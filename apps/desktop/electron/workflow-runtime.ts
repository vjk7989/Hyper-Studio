import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { app } from 'electron'
import { verifiedWorkflowRuntime, workflowRuntimeNames, workflowRuntimePaths, workflowRuntimeTarget } from './workflow-runtime-config'

export { workflowRuntimePaths } from './workflow-runtime-config'

function resource(name: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, name)
    : path.resolve(__dirname, `../resources/${name}`)
}

/** Inspect an existing managed runtime without creating files or invoking uv. */
export function installedWorkflowRuntime(sharedRoot: string): string | null {
  const target = workflowRuntimeTarget()
  const names = workflowRuntimeNames(target)
  const paths = workflowRuntimePaths(sharedRoot, target)
  const lock = resource(names.lock)
  return verifiedWorkflowRuntime(paths, lock)
}

async function run(file: string, args: string[], env: NodeJS.ProcessEnv, log: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(log, { flags: 'a' })
    let stdout = ''
    const child = spawn(file, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], signal })
    child.stdout.on('data', chunk => { stdout += String(chunk); output.write(chunk) })
    child.stderr.on('data', chunk => output.write(chunk))
    child.once('error', error => { output.end(); reject(error) })
    child.once('close', code => {
      output.end()
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(`Workflow runtime setup failed (exit ${code}). See ${log}`))
    })
  })
}

export async function ensureWorkflowRuntime(sharedRoot: string, signal: AbortSignal): Promise<string> {
  const target = workflowRuntimeTarget()
  const names = workflowRuntimeNames(target)
  const paths = workflowRuntimePaths(sharedRoot, target)
  const lock = resource(names.lock)
  const uv = app.isPackaged ? path.join(process.resourcesPath, 'tools', names.uv)
    : path.resolve(__dirname, '../../../.tools/workflow', target === 'windows-x64' ? names.uv : `${target}/${names.uv}`)
  if (!fs.existsSync(uv) || !fs.existsSync(lock)) throw new Error('Workflow runtime installer is missing from the application')
  if (verifiedWorkflowRuntime(paths, lock)) return paths.python
  const hash = crypto.createHash('sha256').update(fs.readFileSync(lock)).digest('hex')
  for (const dir of [paths.root, paths.managedPython, paths.cache, paths.temp, path.dirname(paths.log)]) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const env: NodeJS.ProcessEnv = {
    SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR, PATH: process.env.PATH,
    HOME: sharedRoot, USERPROFILE: sharedRoot, APPDATA: path.join(sharedRoot, 'caches', 'workflow', 'appdata'),
    LOCALAPPDATA: path.join(sharedRoot, 'caches', 'workflow', 'localappdata'),
    XDG_CONFIG_HOME: path.join(sharedRoot, 'caches', 'workflow', target, 'config'),
    XDG_DATA_HOME: path.join(sharedRoot, 'caches', 'workflow', target, 'data'),
    XDG_STATE_HOME: path.join(sharedRoot, 'caches', 'workflow', target, 'state'),
    XDG_CACHE_HOME: path.join(sharedRoot, 'caches', 'workflow', target, 'cache'),
    TEMP: paths.temp, TMP: paths.temp, TMPDIR: paths.temp,
    UV_CACHE_DIR: paths.cache, UV_PYTHON_INSTALL_DIR: paths.managedPython,
    UV_NO_CONFIG: '1', UV_LINK_MODE: 'copy',
  }
  const execute = (args: string[]) => run(uv, args, env, paths.log, signal)
  await execute(['python', 'install', '3.12', '--no-bin', '--no-registry'])
  const interpreter = (await execute(['python', 'find', '3.12', '--managed-python'])).split(/\r?\n/).at(-1) ?? ''
  const relative = path.relative(paths.managedPython, interpreter)
  if (!interpreter || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Managed workflow Python escaped selected storage')
  await execute(['venv', '--python', interpreter, path.dirname(path.dirname(paths.python))])
  await execute(['pip', 'install', '--python', paths.python, ...(names.cpuTorch ? ['--torch-backend', 'cpu'] : []), '-r', lock])
  fs.writeFileSync(paths.marker, JSON.stringify({ lockSha256: hash, installedAt: new Date().toISOString() }))
  return paths.python
}

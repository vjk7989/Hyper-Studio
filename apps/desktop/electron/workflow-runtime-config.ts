import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export type WorkflowRuntimeTarget = 'windows-x64' | 'macos-arm64' | 'linux-x64'

export function workflowRuntimeTarget(platform = process.platform, arch = process.arch): WorkflowRuntimeTarget {
  if (platform === 'win32' && arch === 'x64') return 'windows-x64'
  if (platform === 'darwin' && arch === 'arm64') return 'macos-arm64'
  if (platform === 'linux' && arch === 'x64') return 'linux-x64'
  throw new Error(`Managed workflow runtime is unavailable for ${platform}/${arch}`)
}

export function workflowRuntimeNames(target: WorkflowRuntimeTarget): { lock: string; uv: string; cpuTorch: boolean } {
  switch (target) {
    case 'windows-x64': return { lock: 'workflow-requirements-win.lock', uv: 'uv.exe', cpuTorch: false }
    case 'macos-arm64': return { lock: 'workflow-requirements-mac-arm64.lock', uv: 'uv', cpuTorch: false }
    case 'linux-x64': return { lock: 'workflow-requirements-linux-x64.lock', uv: 'uv', cpuTorch: true }
  }
}

export function workflowRuntimePaths(sharedRoot: string, target = workflowRuntimeTarget()) {
  // Keep the existing Windows layout readable for installations made by Phase 4.
  const root = path.join(sharedRoot, 'runtimes', 'workflow', target === 'windows-x64' ? '' : target)
  const python = target === 'windows-x64'
    ? path.join(root, '.venv', 'Scripts', 'python.exe')
    : path.join(root, '.venv', 'bin', 'python3')
  return {
    root,
    python,
    managedPython: path.join(root, 'python'),
    marker: path.join(root, 'install.json'),
    cache: path.join(sharedRoot, 'caches', 'uv', target),
    temp: path.join(sharedRoot, 'caches', 'workflow', target, 'tmp'),
    log: path.join(sharedRoot, 'caches', 'workflow', target, 'install.log'),
  }
}

export function verifiedWorkflowRuntime(paths: ReturnType<typeof workflowRuntimePaths>, lock: string): string | null {
  try {
    if (!fs.existsSync(lock) || !fs.existsSync(paths.python)) return null
    const hash = crypto.createHash('sha256').update(fs.readFileSync(lock)).digest('hex')
    const marker = JSON.parse(fs.readFileSync(paths.marker, 'utf8')) as { lockSha256?: string }
    return marker.lockSha256 === hash ? paths.python : null
  } catch { return null }
}

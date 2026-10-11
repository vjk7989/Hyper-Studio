import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import type { ChildProcess } from 'node:child_process'
import { createWorkflowCpuProbe, prepareWorkflowPaths, workflowArguments } from './workflow-engine-config.ts'

const root = path.resolve('.local-tmp', 'workflow-engine-tests')
fs.mkdirSync(root, { recursive: true })
const folders: string[] = []
afterEach(() => { for (const folder of folders.splice(0)) fs.rmSync(folder, { recursive: true, force: true }) })

function fixture() {
  const folder = fs.mkdtempSync(path.join(root, 'case-'))
  folders.push(folder)
  const project = path.join(folder, 'project')
  const shared = path.join(folder, 'shared')
  fs.mkdirSync(project)
  fs.mkdirSync(shared)
  return { project, shared }
}

describe('workflow engine launch paths', () => {
  it('puts all mutable engine paths in the project or selected shared storage', () => {
    const { project, shared } = fixture()
    const paths = prepareWorkflowPaths(project, shared)
    for (const key of ['input', 'output', 'user', 'temp', 'database'] as const) {
      assert.equal(path.relative(project, paths[key]).startsWith('..'), false)
    }
    for (const key of ['models', 'cache', 'extensions', 'extraPathsConfig', 'processTemp'] as const) assert.equal(path.relative(shared, paths[key]).startsWith('..'), false)
    assert.match(fs.readFileSync(paths.extraPathsConfig, 'utf8'), /is_default: true/)
    assert.match(fs.readFileSync(paths.extraPathsConfig, 'utf8'), /custom_nodes:/)
    const args = workflowArguments(paths, path.join(shared, 'canvas'), 43210)
    assert.deepEqual(args.slice(0, 5), ['--listen', '127.0.0.1', '--port', '43210', '--disable-auto-launch'])
    assert.equal(args[args.indexOf('--models-directory') + 1], paths.models)
    assert.equal(args[args.indexOf('--database-url') + 1], `sqlite:///${paths.database.replaceAll('\\', '/')}`)
    assert.equal(args[args.indexOf('--extra-model-paths-config') + 1], paths.extraPathsConfig)
    assert.equal(args.includes('--enable-manager'), true)
  })

  it('rejects project and shared storage symlinks before creating engine files', () => {
    const { project, shared } = fixture()
    const outside = path.join(path.dirname(project), 'outside')
    fs.mkdirSync(outside)
    try { fs.symlinkSync(outside, path.join(project, 'outputs'), process.platform === 'win32' ? 'junction' : 'dir') }
    catch { return } // Windows may deny symlink creation to an unprivileged test process.
    assert.throws(() => prepareWorkflowPaths(project, shared), /symbolic links/)
    fs.rmSync(path.join(project, 'outputs'))
    fs.symlinkSync(outside, path.join(shared, 'models'), process.platform === 'win32' ? 'junction' : 'dir')
    assert.throws(() => prepareWorkflowPaths(project, shared), /symbolic link/)
  })
})

function fakeRuntime() {
  const folder = fs.mkdtempSync(path.join(root, 'probe-'))
  folders.push(folder)
  const scripts = path.join(folder, '.venv', 'Scripts')
  fs.mkdirSync(scripts, { recursive: true })
  const python = path.join(scripts, 'python.exe')
  const marker = path.join(folder, 'install.json')
  fs.writeFileSync(python, '')
  fs.writeFileSync(marker, 'runtime-1')
  return { python, marker }
}

function fakeChild() {
  const child = new EventEmitter() as ChildProcess
  const stdout = new EventEmitter()
  let killed = false
  Object.assign(child, { stdout, kill: () => { killed = true; return true } })
  return {
    child,
    emitResult(result: string, code = 0) {
      stdout.emit('data', Buffer.from(result))
      child.emit('close', code)
    },
    wasKilled: () => killed,
  }
}

describe('workflow CPU probe', () => {
  it('runs asynchronously, caches the result, and invalidates after runtime installation', async () => {
    const { python, marker } = fakeRuntime()
    const children: ReturnType<typeof fakeChild>[] = []
    const probe = createWorkflowCpuProbe(() => {
      const child = fakeChild()
      children.push(child)
      return child.child
    })
    const pending = probe(python, {}, new AbortController().signal)
    assert.equal(children.length, 1)
    children[0].emitResult('cpu\n')
    assert.equal(await pending, true)
    assert.equal(await probe(python, {}, new AbortController().signal), true)
    assert.equal(children.length, 1)

    fs.writeFileSync(marker, 'runtime-2')
    const changed = probe(python, {}, new AbortController().signal)
    assert.equal(children.length, 2)
    children[1].emitResult('accelerated\n')
    assert.equal(await changed, false)
  })

  it('cancels the child and does not cache a failed or cancelled probe', async () => {
    const { python } = fakeRuntime()
    const children: ReturnType<typeof fakeChild>[] = []
    const probe = createWorkflowCpuProbe(() => {
      const child = fakeChild()
      children.push(child)
      return child.child
    })
    const controller = new AbortController()
    const pending = probe(python, {}, controller.signal)
    controller.abort()
    await assert.rejects(pending, /cancelled/)
    assert.equal(children[0].wasKilled(), true)

    const retry = probe(python, {}, new AbortController().signal)
    children[1].emitResult('broken', 1)
    await assert.rejects(retry, /cannot import PyTorch/)
    const final = probe(python, {}, new AbortController().signal)
    children[2].emitResult('accelerated')
    assert.equal(await final, false)
  })
})

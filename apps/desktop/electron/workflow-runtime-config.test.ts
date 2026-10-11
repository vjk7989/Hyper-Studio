import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { verifiedWorkflowRuntime, workflowRuntimeNames, workflowRuntimePaths, workflowRuntimeTarget } from './workflow-runtime-config.ts'

const fixtures: string[] = []
afterEach(() => { for (const folder of fixtures.splice(0)) fs.rmSync(folder, { recursive: true, force: true }) })

describe('managed workflow runtime platforms', () => {
  it('accepts only packaged platform and architecture pairs', () => {
    assert.equal(workflowRuntimeTarget('win32', 'x64'), 'windows-x64')
    assert.equal(workflowRuntimeTarget('darwin', 'arm64'), 'macos-arm64')
    assert.equal(workflowRuntimeTarget('linux', 'x64'), 'linux-x64')
    assert.throws(() => workflowRuntimeTarget('darwin', 'x64'), /unavailable/)
    assert.throws(() => workflowRuntimeTarget('linux', 'arm64'), /unavailable/)
  })

  it('keeps each runtime and all cache paths inside selected storage', () => {
    const shared = path.resolve('.local-tmp', 'workflow-runtime-config-test')
    for (const target of ['windows-x64', 'macos-arm64', 'linux-x64'] as const) {
      const paths = workflowRuntimePaths(shared, target)
      for (const candidate of Object.values(paths)) {
        const relative = path.relative(shared, candidate)
        assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), candidate)
      }
      assert.equal(path.basename(paths.python), target === 'windows-x64' ? 'python.exe' : 'python3')
      assert.equal(path.basename(paths.marker), 'install.json')
    }
    assert.equal(workflowRuntimePaths(shared, 'windows-x64').root, path.join(shared, 'runtimes', 'workflow'))
    assert.notEqual(workflowRuntimePaths(shared, 'macos-arm64').root, workflowRuntimePaths(shared, 'linux-x64').root)
  })

  it('selects the matching lock and CPU wheel policy', () => {
    assert.deepEqual(workflowRuntimeNames('windows-x64'), { lock: 'workflow-requirements-win.lock', uv: 'uv.exe', cpuTorch: false })
    assert.deepEqual(workflowRuntimeNames('macos-arm64'), { lock: 'workflow-requirements-mac-arm64.lock', uv: 'uv', cpuTorch: false })
    assert.deepEqual(workflowRuntimeNames('linux-x64'), { lock: 'workflow-requirements-linux-x64.lock', uv: 'uv', cpuTorch: true })
  })
})

describe('installed workflow runtime inspection', () => {
  it('accepts only an interpreter with a marker matching the current lock', () => {
    const base = path.resolve('.local-tmp', 'workflow-runtime-config-tests')
    fs.mkdirSync(base, { recursive: true })
    const shared = fs.mkdtempSync(path.join(base, 'case-'))
    fixtures.push(shared)
    const paths = workflowRuntimePaths(shared, 'windows-x64')
    const lock = path.join(shared, 'workflow.lock')
    fs.mkdirSync(path.dirname(paths.python), { recursive: true })
    fs.writeFileSync(lock, 'pinned packages')
    fs.writeFileSync(paths.python, '')
    assert.equal(verifiedWorkflowRuntime(paths, lock), null)
    fs.writeFileSync(paths.marker, '{broken')
    assert.equal(verifiedWorkflowRuntime(paths, lock), null)
    const lockSha256 = crypto.createHash('sha256').update(fs.readFileSync(lock)).digest('hex')
    fs.writeFileSync(paths.marker, JSON.stringify({ lockSha256 }))
    assert.equal(verifiedWorkflowRuntime(paths, lock), paths.python)
    fs.writeFileSync(lock, 'changed packages')
    assert.equal(verifiedWorkflowRuntime(paths, lock), null)
    fs.rmSync(paths.python)
    assert.equal(verifiedWorkflowRuntime(paths, lock), null)
  })
})

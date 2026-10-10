import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import { workflowRuntimeNames, workflowRuntimePaths, workflowRuntimeTarget } from './workflow-runtime-config.ts'

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

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { prepareWorkflowPaths, workflowArguments } from './workflow-engine-config.ts'

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

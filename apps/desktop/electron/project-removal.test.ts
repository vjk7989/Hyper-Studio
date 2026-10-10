import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, it } from 'node:test'
import { validateProjectTrashTarget } from './project-removal.ts'

const root = path.resolve('.local-tmp', 'project-removal-tests')
fs.mkdirSync(root, { recursive: true })
const fixtures: string[] = []

function fixture(projectId = 'project-one') {
  const sandbox = fs.mkdtempSync(path.join(root, 'fixture-'))
  fixtures.push(sandbox)
  const folder = path.join(sandbox, 'project')
  fs.mkdirSync(path.join(folder, '.hyper-studio'), { recursive: true })
  fs.writeFileSync(path.join(folder, '.hyper-studio', 'project.json'), JSON.stringify({ version: 1, projectId }))
  const input = { projectId, folder, sharedRoot: path.join(sandbox, 'shared'), userData: path.join(sandbox, 'user-data'),
    registeredFolders: [{ projectId, folder }] }
  fs.mkdirSync(input.sharedRoot)
  return { sandbox, folder, input }
}

afterEach(() => {
  for (const folder of fixtures.splice(0)) fs.rmSync(folder, { recursive: true, force: true })
})

it('rejects trashing a folder after its manifest is switched to another project', () => {
  const { folder, input } = fixture()
  fs.writeFileSync(path.join(folder, '.hyper-studio', 'project.json'), JSON.stringify({ version: 1, projectId: 'other' }))
  assert.throws(() => validateProjectTrashTarget(input), /manifest does not match/)
})

it('rejects trashing a folder that contains another registered project or app data', () => {
  const { folder, input } = fixture()
  assert.throws(() => validateProjectTrashTarget({ ...input, registeredFolders: [...input.registeredFolders,
    { projectId: 'other', folder: path.join(folder, 'nested') }] }), /contains another registered project/)
  assert.throws(() => validateProjectTrashTarget({ ...input, userData: path.join(folder, 'settings') }), /overlaps app data/)
})

it('rejects trashing a project that overlaps shared storage', () => {
  const { folder, input } = fixture()
  fs.mkdirSync(path.join(folder, 'models'))
  assert.throws(() => validateProjectTrashTarget({ ...input, sharedRoot: path.join(folder, 'models') }), /overlaps shared storage/)
})

it('rejects symlinked project paths and metadata', () => {
  const { sandbox, folder, input } = fixture()
  const link = path.join(sandbox, 'linked-project')
  fs.symlinkSync(folder, link, 'junction')
  assert.throws(() => validateProjectTrashTarget({ ...input, folder: link }), /symbolic-link/)
  const metadata = path.join(folder, '.hyper-studio')
  fs.renameSync(metadata, path.join(sandbox, 'metadata'))
  fs.symlinkSync(path.join(sandbox, 'metadata'), metadata, 'junction')
  assert.throws(() => validateProjectTrashTarget(input), /managed project/)
})

it('allows only the selected managed project folder', () => {
  const { folder, input } = fixture()
  assert.equal(validateProjectTrashTarget(input), fs.realpathSync(folder))
  assert.throws(() => validateProjectTrashTarget({ ...input, folder: path.parse(folder).root }), /drive root/)
})

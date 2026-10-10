import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { importProjectWorkflow, listProjectWorkflows, openProjectWorkflow, saveProjectWorkflow } from './workflow-files.ts'

const root = path.resolve('.local-tmp', 'workflow-files-tests')
fs.mkdirSync(root, { recursive: true })
const folders: string[] = []
afterEach(() => { for (const folder of folders.splice(0)) fs.rmSync(folder, { recursive: true, force: true }) })

function project(): string {
  const folder = fs.mkdtempSync(path.join(root, 'project-'))
  fs.mkdirSync(path.join(folder, 'workflows'))
  folders.push(folder)
  return folder
}

describe('project workflow files', () => {
  it('keeps imported node identifiers and raw JSON intact', () => {
    const folder = project()
    const raw = '{"nodes":[{"id":7,"type":"ComfyNode"}],"links":[[12,7,0,8,0]]}'
    const source = path.join(folder, 'incoming.json')
    fs.writeFileSync(source, raw)
    assert.equal(importProjectWorkflow(folder, source), 'incoming.json')
    assert.equal(openProjectWorkflow(folder, 'incoming.json'), raw)
    assert.deepEqual(listProjectWorkflows(folder), ['incoming.json'])
    assert.equal(importProjectWorkflow(folder, source), 'incoming (1).json')
  })

  it('rejects escape paths and malformed JSON', () => {
    const folder = project()
    assert.throws(() => saveProjectWorkflow(folder, '../outside.json', '{}'), /Invalid workflow filename|contained/)
    assert.throws(() => saveProjectWorkflow(folder, 'bad.json', '[]'), /must be an object/)
    assert.throws(() => saveProjectWorkflow(folder, 'bad.json', '{'), /Unexpected end|JSON/)
  })
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import type { TestContext } from 'node:test'
import { exportProjectWorkflow, importProjectWorkflow, listProjectWorkflows, openProjectWorkflow, saveProjectWorkflow } from './workflow-files.ts'

const root = path.resolve('.local-tmp', 'workflow-files-tests')
fs.mkdirSync(root, { recursive: true })
const created: string[] = []
afterEach(() => { for (const folder of created.splice(0)) fs.rmSync(folder, { recursive: true, force: true }) })

function scratch(prefix: string): string {
  const folder = fs.mkdtempSync(path.join(root, prefix))
  created.push(folder)
  return folder
}

function project(): string {
  const folder = scratch('project-')
  fs.mkdirSync(path.join(folder, 'workflows'))
  return folder
}

function workflowBytes(folder: string, name: string): Buffer {
  return fs.readFileSync(path.join(folder, 'workflows', name))
}

function payloadOfSize(bytes: number): string {
  return `{"pad":"${'x'.repeat(bytes - Buffer.byteLength('{"pad":""}'))}"}`
}

function link(target: string, linkPath: string, t: TestContext): boolean {
  try {
    fs.symlinkSync(target, linkPath, 'file')
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? ''
    if (['EPERM', 'EACCES', 'ENOSYS', 'UNKNOWN'].includes(code)) {
      t.skip(`symbolic links unavailable in this environment (${code}): ${(error as Error).message}`)
      return false
    }
    throw error
  }
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
    assert.deepEqual(workflowBytes(folder, 'incoming.json'), Buffer.from(raw, 'utf8'))
    assert.equal(importProjectWorkflow(folder, source), 'incoming (1).json')
  })

  it('does not reinterpret numeric or string node ids on save and open', () => {
    const folder = project()
    const raw = '{"nodes":[{"id":7},{"id":"7"},{"id":"08"},{"id":0}],"links":[["0",7,0,"08",0]]}'
    saveProjectWorkflow(folder, 'ids.json', raw)
    assert.deepEqual(workflowBytes(folder, 'ids.json'), Buffer.from(raw, 'utf8'))
    const nodes = JSON.parse(openProjectWorkflow(folder, 'ids.json')).nodes
    assert.deepEqual(nodes.map((node: { id: unknown }) => node.id), [7, '7', '08', 0])
    assert.deepEqual(nodes.map((node: { id: unknown }) => typeof node.id), ['number', 'string', 'string', 'number'])
  })

  it('stores the exact bytes of a valid workflow instead of re-serialising it', () => {
    const folder = project()
    // Escaped slashes, a duplicate key, non-ASCII, an overflowing number and a 20-digit integer
    // all change under a JSON.parse/stringify round trip.
    const raw = '{"link":"a\\/b","link":"c","pad":"caf\u00e9","big":1e400,"exact":12345678901234567890}'
    saveProjectWorkflow(folder, 'raw.json', raw)
    assert.deepEqual(workflowBytes(folder, 'raw.json'), Buffer.from(raw, 'utf8'))
    assert.equal(openProjectWorkflow(folder, 'raw.json'), raw)
  })

  it('exports the workflow bytes verbatim', () => {
    const folder = project()
    const raw = '{"nodes":[{"id":"a"},{"id":3}],"note":"keep \\/ as-is"}'
    saveProjectWorkflow(folder, 'graph.json', raw)
    const destination = path.join(scratch('export-'), 'graph.json')
    exportProjectWorkflow(folder, 'graph.json', destination)
    assert.deepEqual(fs.readFileSync(destination), Buffer.from(raw, 'utf8'))
  })

  it('imports a colliding source under a new name without touching the existing workflow', () => {
    const folder = project()
    const existing = '{"nodes":[{"id":"mine"}]}'
    const incoming = '{"nodes":[{"id":11}]}'
    fs.writeFileSync(path.join(folder, 'workflows', 'incoming.json'), existing)
    const source = path.join(scratch('source-'), 'incoming.json')
    fs.writeFileSync(source, incoming)
    assert.equal(importProjectWorkflow(folder, source), 'incoming (1).json')
    assert.equal(importProjectWorkflow(folder, source), 'incoming (2).json')
    assert.deepEqual(workflowBytes(folder, 'incoming.json'), Buffer.from(existing, 'utf8'))
    assert.deepEqual(workflowBytes(folder, 'incoming (1).json'), Buffer.from(incoming, 'utf8'))
    assert.deepEqual(workflowBytes(folder, 'incoming (2).json'), Buffer.from(incoming, 'utf8'))
    assert.deepEqual(listProjectWorkflows(folder), ['incoming (1).json', 'incoming (2).json', 'incoming.json'])
  })

  it('truncates a near-limit source name instead of throwing on collision', () => {
    const folder = project()
    const stem = 'a'.repeat(121)
    const source = path.join(scratch('source-'), `${stem}.json`)
    fs.writeFileSync(source, '{"nodes":[]}')
    assert.equal(importProjectWorkflow(folder, source), `${stem}.json`)
    const collided = importProjectWorkflow(folder, source)
    assert.notEqual(collided, `${stem}.json`)
    assert.equal(collided.length, 128)
    assert.ok(collided.endsWith(' (1).json'), collided)
    assert.deepEqual(listProjectWorkflows(folder), [`${stem}.json`, collided].sort((a, b) => a.localeCompare(b)))
  })

  it('rejects escape paths and malformed JSON', () => {
    const folder = project()
    assert.throws(() => saveProjectWorkflow(folder, '../outside.json', '{}'), /Invalid workflow filename|contained/)
    assert.throws(() => saveProjectWorkflow(folder, 'bad.json', '[]'), /must be an object/)
    assert.throws(() => saveProjectWorkflow(folder, 'bad.json', '{'), /Unexpected end|JSON/)
    assert.throws(() => saveProjectWorkflow(folder, 'bad.json', 'null'), /must be an object/)
    assert.deepEqual(fs.readdirSync(path.join(folder, 'workflows')), [])
  })

  it('leaves the stored workflow untouched when a save payload is rejected', () => {
    const folder = project()
    const stored = '{"nodes":[{"id":4}]}'
    saveProjectWorkflow(folder, 'graph.json', stored)
    for (const payload of ['{', '[]', '"text"', '42', 'null', '']) {
      assert.throws(() => saveProjectWorkflow(folder, 'graph.json', payload), /JSON|object/)
    }
    assert.deepEqual(workflowBytes(folder, 'graph.json'), Buffer.from(stored, 'utf8'))
    assert.deepEqual(fs.readdirSync(path.join(folder, 'workflows')), ['graph.json'])
  })

  it('rejects a malformed import without writing a partial workflow', () => {
    const folder = project()
    const source = path.join(scratch('source-'), 'broken.json')
    fs.writeFileSync(source, '{"nodes":[}')
    assert.throws(() => importProjectWorkflow(folder, source), /JSON/)
    const list = path.join(scratch('source-'), 'list.json')
    fs.writeFileSync(list, '[1,2,3]')
    assert.throws(() => importProjectWorkflow(folder, list), /must be an object/)
    assert.deepEqual(fs.readdirSync(path.join(folder, 'workflows')), [])
  })

  it('rejects a workflow payload over the 20 MB cap but accepts one at the cap', () => {
    const folder = project()
    const stored = '{"nodes":[]}'
    saveProjectWorkflow(folder, 'graph.json', stored)
    const atCap = payloadOfSize(20 * 1024 * 1024)
    assert.equal(Buffer.byteLength(atCap), 20 * 1024 * 1024)
    assert.equal(saveProjectWorkflow(folder, 'graph.json', atCap), 'graph.json')
    const overCap = payloadOfSize(20 * 1024 * 1024 + 1)
    assert.throws(() => saveProjectWorkflow(folder, 'graph.json', overCap), /exceeds 20 MB/)
    assert.deepEqual(workflowBytes(folder, 'graph.json'), Buffer.from(atCap, 'utf8'))
    assert.deepEqual(fs.readdirSync(path.join(folder, 'workflows')), ['graph.json'])
  })

  it('rejects an oversized import source without writing anything', () => {
    const folder = project()
    const source = path.join(scratch('source-'), 'huge.json')
    fs.writeFileSync(source, payloadOfSize(20 * 1024 * 1024 + 1))
    assert.throws(() => importProjectWorkflow(folder, source), /exceeds 20 MB/)
    assert.deepEqual(fs.readdirSync(path.join(folder, 'workflows')), [])
  })

  it('rejects workflow names that escape, nest or target a reserved device', () => {
    const folder = project()
    for (const name of ['../outside.json', '..\\outside.json', 'nested/graph.json', 'nested\\graph.json',
      'C:evil.json', 'CON.json', 'nul.json', 'com1.json', '.', '..', '   ', '']) {
      assert.throws(() => saveProjectWorkflow(folder, name, '{}'), /Invalid workflow filename|contained/, name)
      assert.throws(() => openProjectWorkflow(folder, name), /Invalid workflow filename|contained/, name)
    }
    assert.deepEqual(fs.readdirSync(path.join(folder, 'workflows')), [])
  })

  it('rejects a workflow name over 128 characters or without a .json extension', () => {
    const folder = project()
    assert.equal(saveProjectWorkflow(folder, `${'a'.repeat(123)}.json`, '{}'), `${'a'.repeat(123)}.json`)
    assert.throws(() => saveProjectWorkflow(folder, `${'a'.repeat(124)}.json`, '{}'), /Invalid workflow filename/)
    for (const name of ['notes.txt', 'graph', 'graph.json.bak']) {
      assert.throws(() => saveProjectWorkflow(folder, name, '{}'), /Invalid workflow filename/, name)
    }
    assert.equal(saveProjectWorkflow(folder, 'MiXeD.JSON', '{}'), 'MiXeD.JSON')
    assert.deepEqual(listProjectWorkflows(folder), [`${'a'.repeat(123)}.json`, 'MiXeD.JSON'])
  })

  it('refuses to open a workflow name that is a symlink out of the project', (t) => {
    const folder = project()
    const secret = path.join(scratch('outside-'), 'secret.json')
    fs.writeFileSync(secret, '{"secret":true}')
    if (!link(secret, path.join(folder, 'workflows', 'linked.json'), t)) return
    assert.throws(() => openProjectWorkflow(folder, 'linked.json'), /symbolic link/i)
    assert.equal(fs.readFileSync(secret, 'utf8'), '{"secret":true}')
  })

  it('refuses to save through a workflow name that is a symlink out of the project', (t) => {
    const folder = project()
    const secret = path.join(scratch('outside-'), 'secret.json')
    fs.writeFileSync(secret, '{"secret":true}')
    if (!link(secret, path.join(folder, 'workflows', 'linked.json'), t)) return
    assert.throws(() => saveProjectWorkflow(folder, 'linked.json', '{"nodes":[]}'), /symbolic link/i)
    assert.equal(fs.readFileSync(secret, 'utf8'), '{"secret":true}')
  })

  it('omits symlinked entries from the project workflow list', (t) => {
    const folder = project()
    const secret = path.join(scratch('outside-'), 'secret.json')
    fs.writeFileSync(secret, '{"secret":true}')
    if (!link(secret, path.join(folder, 'workflows', 'linked.json'), t)) return
    saveProjectWorkflow(folder, 'real.json', '{}')
    assert.deepEqual(listProjectWorkflows(folder), ['real.json'])
  })

  it('replaces an existing export destination in one step and leaves no temp file', () => {
    const folder = project()
    saveProjectWorkflow(folder, 'graph.json', '{"nodes":[{"id":1}]}')
    const out = scratch('export-')
    const destination = path.join(out, 'graph.json')
    exportProjectWorkflow(folder, 'graph.json', destination)
    saveProjectWorkflow(folder, 'graph.json', '{"nodes":[{"id":2}]}')
    exportProjectWorkflow(folder, 'graph.json', destination)
    assert.equal(fs.readFileSync(destination, 'utf8'), '{"nodes":[{"id":2}]}')
    assert.deepEqual(fs.readdirSync(out), ['graph.json'])
  })

  it('leaves the previous export destination intact when the replacement fails', (t) => {
    const folder = project()
    saveProjectWorkflow(folder, 'graph.json', '{"nodes":[{"id":1}]}')
    const out = scratch('export-')
    const destination = path.join(out, 'graph.json')
    fs.writeFileSync(destination, '{"kept":true}')
    fs.chmodSync(destination, 0o444)
    try {
      fs.writeFileSync(destination, '{"probe":true}')
      fs.chmodSync(destination, 0o600)
      t.skip('this filesystem lets the test user replace a read-only destination file')
      return
    } catch { /* the replacement must fail for this case to be observable */ }
    assert.throws(() => exportProjectWorkflow(folder, 'graph.json', destination))
    assert.equal(fs.readFileSync(destination, 'utf8'), '{"kept":true}')
    assert.deepEqual(fs.readdirSync(out), ['graph.json'])
  })

  it('fails the export without destroying a destination that is a directory', () => {
    const folder = project()
    saveProjectWorkflow(folder, 'graph.json', '{"nodes":[{"id":1}]}')
    const out = scratch('export-')
    const destination = path.join(out, 'graph.json')
    fs.mkdirSync(destination)
    fs.writeFileSync(path.join(destination, 'keep.txt'), 'keep')
    assert.throws(() => exportProjectWorkflow(folder, 'graph.json', destination))
    assert.deepEqual(fs.readdirSync(destination), ['keep.txt'])
    assert.deepEqual(fs.readdirSync(out), ['graph.json'])
  })

  it('replaces an export destination symlink instead of writing through it', (t) => {
    const folder = project()
    const raw = '{"nodes":[{"id":"exported"}]}'
    saveProjectWorkflow(folder, 'graph.json', raw)
    const outside = path.join(scratch('outside-'), 'outside.json')
    fs.writeFileSync(outside, '{"untouched":true}')
    const destination = path.join(scratch('export-'), 'graph.json')
    if (!link(outside, destination, t)) return
    exportProjectWorkflow(folder, 'graph.json', destination)
    assert.equal(fs.readFileSync(outside, 'utf8'), '{"untouched":true}')
    assert.equal(fs.readFileSync(destination, 'utf8'), raw)
    assert.equal(fs.lstatSync(destination).isSymbolicLink(), false)
  })
})
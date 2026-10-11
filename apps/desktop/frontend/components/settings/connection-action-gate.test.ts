import assert from 'node:assert/strict'
import test from 'node:test'
import { createConnectionActionGate } from './connection-action-gate.ts'

test('rapid save, test, delete, and selection actions cannot overlap', async () => {
  const changes: Array<string | null> = []
  let finish!: () => void
  const pendingTask = new Promise<void>(resolve => { finish = resolve })
  const gate = createConnectionActionGate(action => changes.push(action))

  const save = gate.run('save', () => pendingTask)
  assert.equal(gate.pending, 'save')
  assert.equal(await gate.run('test', async () => { throw new Error('test should not run') }), false)
  assert.equal(await gate.run('delete', async () => { throw new Error('delete should not run') }), false)
  assert.equal(await gate.run('selection', async () => { throw new Error('selection should not change') }), false)
  finish()
  assert.equal(await save, true)
  assert.equal(gate.pending, null)
  assert.deepEqual(changes, ['save', null])
})

test('a rejected vault action releases the gate for recovery', async () => {
  const changes: Array<string | null> = []
  const gate = createConnectionActionGate(action => changes.push(action))

  await assert.rejects(gate.run('vault', async () => { throw new Error('locked') }), /locked/)
  assert.equal(gate.pending, null)
  assert.equal(await gate.run('selection', async () => {}), true)
  assert.deepEqual(changes, ['vault', null, 'selection', null])
})

test('import confirmation can settle without blocking refresh', async () => {
  const gate = createConnectionActionGate(() => {})
  assert.equal(await gate.run('import', async () => {}), true)
  assert.equal(await gate.run('refresh', async () => {}), true)
  assert.equal(gate.pending, null)
})

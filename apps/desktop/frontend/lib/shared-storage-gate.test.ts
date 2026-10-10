import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canStartRuntimeSetup } from './shared-storage-gate.ts'

describe('shared storage startup gate', () => {
  it('holds runtime setup until a saved folder is available', () => {
    assert.equal(canStartRuntimeSetup(undefined), false)
    assert.equal(canStartRuntimeSetup(null), false)
    assert.equal(canStartRuntimeSetup('  '), false)
    assert.equal(canStartRuntimeSetup('G:/Hyper-Studio-data'), true)
  })
})

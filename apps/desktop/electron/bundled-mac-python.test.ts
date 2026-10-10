import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import { hasBundledMacPython } from './bundled-mac-python.ts'

describe('packaged macOS legacy runtime readiness', () => {
  const pythonDir = path.join('application', 'Contents', 'Resources', 'python')
  const interpreter = path.join(pythonDir, 'bin', 'python3')

  it('allows the hosted workspace when the optional interpreter is absent', () => {
    assert.equal(hasBundledMacPython(pythonDir, () => false), false)
  })

  it('keeps the local backend available when the interpreter exists', () => {
    assert.equal(hasBundledMacPython(pythonDir, candidate => candidate === interpreter), true)
  })
})

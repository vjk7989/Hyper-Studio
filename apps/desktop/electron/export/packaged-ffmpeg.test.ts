import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { findPackagedFfmpegPath } from './packaged-ffmpeg.ts'

test('packaged export binary resolves from the app resources directory on each platform', () => {
  const resources = path.resolve('fixture', 'resources')
  for (const [platform, fileName] of [
    ['win32', 'ffmpeg.exe'],
    ['darwin', 'ffmpeg'],
    ['linux', 'ffmpeg'],
  ] as const) {
    const expected = path.join(resources, 'tools', fileName)
    assert.equal(findPackagedFfmpegPath(resources, platform, candidate => candidate === expected), expected)
  }
})

test('missing packaged export binary falls through to the optional runtime', () => {
  assert.equal(findPackagedFfmpegPath('missing-resources', 'win32', () => false), null)
})

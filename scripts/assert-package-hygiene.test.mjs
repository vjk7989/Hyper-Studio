import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { inspectWorkflowFrontend } from './assert-package-hygiene.mjs'

async function fixture(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'hyper-studio-hygiene-'))
  for (const [relativePath, content] of Object.entries(files)) {
    const file = path.join(root, relativePath)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, content)
  }
  return root
}

const requiredFiles = {
  'build-manifest.json': '{}',
  'assets/index.js': 'window.addEventListener("hyper-studio:request-workflow", () => {})'
}

test('accepts a minimal branded workflow package', async (t) => {
  const root = await fixture(requiredFiles)
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await inspectWorkflowFrontend(root)

  assert.equal(result.ok, true)
})

test('rejects source maps and source map references', async (t) => {
  const root = await fixture({
    ...requiredFiles,
    'assets/index.js': `${requiredFiles['assets/index.js']}\n//# sourceMappingURL=index.js.map`,
    'assets/index.js.map': '{}'
  })
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await inspectWorkflowFrontend(root)

  assert.equal(result.ok, false)
  assert.deepEqual(result.sourceMaps, ['assets/index.js.map'])
  assert.deepEqual(result.sourceMapReferences, ['assets/index.js'])
})

test('rejects inherited cloud assets and destinations', async (t) => {
  const root = await fixture({
    ...requiredFiles,
    'assets/CloudLoginView-deadbeef.js':
      'fetch("https://cloud.comfy.org/api/session")'
  })
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await inspectWorkflowFrontend(root)

  assert.equal(result.ok, false)
  assert.deepEqual(result.forbiddenAssets, [
    'assets/CloudLoginView-deadbeef.js'
  ])
  assert.deepEqual(result.forbiddenDestinations, [
    {
      file: 'assets/CloudLoginView-deadbeef.js',
      destination: 'https://cloud.comfy.org'
    }
  ])
})

test('requires the build manifest and embed bridge', async (t) => {
  const root = await fixture({ 'assets/index.js': 'console.log("local")' })
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await inspectWorkflowFrontend(root)

  assert.equal(result.ok, false)
  assert.equal(result.hasBuildManifest, false)
  assert.equal(result.hasBridge, false)
})

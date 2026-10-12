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

test('allows source-map examples embedded in JavaScript strings', async (t) => {
  const root = await fixture({
    ...requiredFiles,
    'assets/vendor.js': [
      'const lineExample = "//# sourceMappingURL=example.js.map"',
      "const blockExample = '/*# sourceMappingURL=example.js.map */'"
    ].join('\n')
  })
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await inspectWorkflowFrontend(root)

  assert.equal(result.ok, true)
  assert.deepEqual(result.sourceMapReferences, [])
})

test('rejects inherited cloud assets and destinations', async (t) => {
  const root = await fixture({
    ...requiredFiles,
    'assets/CloudLoginView-deadbeef.js':
      'fetch("https://cloud.comfy.org/api/session")',
    'assets/comfy-logo-cafebabe.js': 'export default "inherited mark"',
    'assets/images/partner-nodes-signin.webp': 'inherited promotion'
  })
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await inspectWorkflowFrontend(root)

  assert.equal(result.ok, false)
  assert.deepEqual(result.forbiddenAssets, [
    'assets/CloudLoginView-deadbeef.js',
    'assets/comfy-logo-cafebabe.js',
    'assets/images/partner-nodes-signin.webp'
  ])
  assert.deepEqual(result.forbiddenDestinations, [
    {
      file: 'assets/CloudLoginView-deadbeef.js',
      destination: 'https://cloud.comfy.org'
    }
  ])
})

test('rejects unified and workspace subscription chunks with eager cloud destinations', async (t) => {
  const root = await fixture({
    ...requiredFiles,
    'assets/SubscriptionRequiredDialogContentUnified-cafe1234.js':
      'const accountEndpoint = "https://cloud.comfy.org/api/account"',
    'assets/SubscriptionRequiredDialogContentWorkspace-beef5678.js':
      'const billingEndpoint = "https://cloud.comfy.org/api/billing"'
  })
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await inspectWorkflowFrontend(root)

  assert.equal(result.ok, false)
  assert.deepEqual(result.forbiddenAssets, [
    'assets/SubscriptionRequiredDialogContentUnified-cafe1234.js',
    'assets/SubscriptionRequiredDialogContentWorkspace-beef5678.js'
  ])
  assert.equal(result.forbiddenDestinations.length, 2)
  assert.ok(
    result.forbiddenDestinations.every(
      ({ destination }) => destination === 'https://cloud.comfy.org'
    )
  )
})

test('rejects every inherited Comfy-owned runtime destination', async (t) => {
  const root = await fixture({
    ...requiredFiles,
    'assets/runtime.js': [
      'https://comfy.org/account',
      'https://testcloud.comfy.org/api',
      'https://stagingcloud.comfy.org/session',
      'wss://api.comfy.org/ws',
      'media.comfy.org'
    ].join('\n')
  })
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await inspectWorkflowFrontend(root)

  assert.equal(result.ok, false)
  assert.deepEqual(
    result.forbiddenDestinations.map(({ destination }) => destination),
    [
      'https://comfy.org',
      'https://testcloud.comfy.org',
      'https://stagingcloud.comfy.org',
      'wss://api.comfy.org'
    ]
  )
})

test('requires the build manifest and embed bridge', async (t) => {
  const root = await fixture({ 'assets/index.js': 'console.log("local")' })
  t.after(() => rm(root, { recursive: true, force: true }))

  const result = await inspectWorkflowFrontend(root)

  assert.equal(result.ok, false)
  assert.equal(result.hasBuildManifest, false)
  assert.equal(result.hasBridge, false)
})

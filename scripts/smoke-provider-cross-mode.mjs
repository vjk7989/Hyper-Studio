import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe')
const shared = path.join(root, '.local-tmp', 'packaged-electron-smoke', 'shared-storage')
const marker = path.join(shared, 'runtimes', 'workflow', 'install.json')
if (!fs.existsSync(executablePath) || !fs.existsSync(marker)) {
  throw new Error('Build the packaged app and complete the repository-local managed workflow runtime smoke first')
}

const home = path.join(root, '.local-tmp', 'provider-cross-mode-smoke', String(Date.now()))
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) {
  fs.mkdirSync(folder, { recursive: true })
}
const projectFolder = path.join(home, 'project')
fs.mkdirSync(projectFolder, { recursive: true })

let nextProviderJob = 0
let releaseEditorJob = false
const calls = []
const mock = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  const json = (status, data) => {
    response.writeHead(status, { 'content-type': 'application/json' })
    response.end(JSON.stringify(data))
  }
  if (request.method === 'POST' && url.pathname === '/generate') {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    const id = `mock-${++nextProviderJob}`
    calls.push({ id, body })
    return json(200, { id })
  }
  const match = /^\/jobs\/(mock-\d+)$/.exec(url.pathname)
  if (request.method === 'GET' && match) {
    const pending = match[1] === 'mock-1' && !releaseEditorJob
    return json(200, pending
      ? { status: 'running', progress: 30 }
      : { status: 'completed', progress: 100, video: { url: `http://127.0.0.1:${mock.address().port}/video/${match[1]}.mp4` } })
  }
  if (request.method === 'GET' && /^\/video\/mock-\d+\.mp4$/.test(url.pathname)) {
    response.writeHead(200, { 'content-type': 'video/mp4' })
    return response.end(Buffer.from('hyper-studio-local-mock-video'))
  }
  json(404, { error: 'not found' })
})
await new Promise((resolve, reject) => mock.once('error', reject).listen(0, '127.0.0.1', resolve))
const providerUrl = `http://127.0.0.1:${mock.address().port}`
const env = {
  ...process.env,
  HOME: home, USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'), LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
}
let app
const waitUntil = async (predicate, timeoutMs, description) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await predicate()
    if (result) return result
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${description}`)
}

try {
  app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox'], timeout: 45000 })
  const window = await app.firstWindow({ timeout: 45000 })
  await window.waitForLoadState('domcontentloaded', { timeout: 45000 })
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.getByText('New Project', { exact: true }).waitFor({ state: 'visible', timeout: 30000 })
  await app.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] })
  }, projectFolder)
  await window.getByText('New Project', { exact: true }).click()
  await window.getByPlaceholder('Project name').fill('Provider cross-mode smoke')
  await window.getByText('Choose a folder', { exact: true }).click()
  await window.getByText(projectFolder, { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
  await window.getByPlaceholder('Project name').press('Enter')
  await window.locator('button[title^="Workflow mode"]').waitFor({ state: 'visible', timeout: 30000 })
  const projectId = decodeURIComponent(new URL(window.url()).hash.split('/').at(-1))
  assert.match(projectId, /^project-[a-zA-Z0-9_-]+$/)

  const profile = await window.evaluate(baseUrl => window.electronAPI.upsertProviderProfile({
    name: 'Cross-mode local mock', provider: 'custom', baseUrl, defaultModelId: 'mock-video',
    custom: {
      submitPath: '/generate', auth: { mode: 'none' },
      requestFields: { prompt: 'prompt', model: 'model' },
      response: { mode: 'async', jobIdPath: 'id', pollPath: '/jobs/{jobId}', statusPath: 'status', outputPath: 'video.url', progressPath: 'progress', completeValues: ['completed'] },
    },
  }), providerUrl)
  assert.equal(profile.hasApiKey, false)
  const editorJob = await window.evaluate(({ projectId, profileId }) => window.electronAPI.submitProviderJob({
    projectId, profileId, modelId: 'mock-video', prompt: 'Editor mock video',
  }), { projectId, profileId: profile.id })
  await waitUntil(() => calls.length >= 1, 10000, 'Editor provider submission')
  assert.equal(calls[0].body.prompt, 'Editor mock video')
  const editorRunning = await window.evaluate(jobId => window.electronAPI.getProviderJob({ jobId }), editorJob.id)
  assert.equal(editorRunning.status, 'running')

  await window.locator('button[title^="Workflow mode"]').click()
  await window.locator('iframe[title="Hyper-Studio workflow canvas"]').waitFor({ state: 'visible', timeout: 150000 })
  const engine = await window.evaluate(() => window.electronAPI.getWorkflowEngineStatus())
  assert.equal(engine.state, 'running')
  assert.equal(engine.projectId, projectId)
  const infoResponse = await fetch(new URL('object_info/HyperStudioGenerateVideo', engine.url))
  assert.equal(infoResponse.status, 200)
  const nodeInfo = await infoResponse.json()
  const choices = nodeInfo.HyperStudioGenerateVideo?.input?.required?.profile_id?.[0] || []
  assert.ok(choices.includes(profile.id), 'Workflow node did not see the saved Editor profile')

  const workflowPrompt = {
    '1': { class_type: 'HyperStudioGenerateVideo', inputs: { profile_id: profile.id, model_id: 'mock-video', prompt: 'Workflow mock video', options_json: '{}' } },
    '2': { class_type: 'PreviewAny', inputs: { source: ['1', 0] } },
  }
  const submittedResponse = await fetch(new URL('prompt', engine.url), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: workflowPrompt, client_id: 'hyper-studio-cross-mode-smoke' }),
  })
  const submitted = await submittedResponse.json()
  if (!submittedResponse.ok || !submitted.prompt_id) throw new Error(`Workflow provider node rejected: ${JSON.stringify(submitted)}`)
  await waitUntil(() => calls.length >= 2, 30000, 'Workflow provider submission')
  assert.equal(calls[1].body.prompt, 'Workflow mock video')
  releaseEditorJob = true
  const finalEditorJob = await waitUntil(async () => {
    const job = await window.evaluate(jobId => window.electronAPI.getProviderJob({ jobId }), editorJob.id)
    return ['succeeded', 'failed', 'cancelled'].includes(job?.status) ? job : null
  }, 30000, 'Editor job completion after mode switch')
  assert.equal(finalEditorJob.status, 'succeeded', finalEditorJob.error)
  const history = await waitUntil(async () => {
    const response = await fetch(new URL(`history/${submitted.prompt_id}`, engine.url))
    const data = await response.json()
    return data[submitted.prompt_id] || null
  }, 60000, 'Workflow node completion')
  assert.equal(history.status?.completed, true, JSON.stringify(history.status))

  const media = await window.evaluate(projectId => window.electronAPI.listWorkspaceMedia({ projectId }), projectId)
  const videos = media.filter(item => item.kind === 'video' && item.relativePath.startsWith('outputs/'))
  assert.equal(videos.length, 2, `Expected two shared videos, got ${JSON.stringify(media)}`)
  for (const video of videos) assert.ok(fs.existsSync(video.absolutePath), video.absolutePath)
  await window.locator('button[title^="Editor mode"]').click()
  await window.getByRole('tablist', { name: 'Editor views' }).waitFor({ state: 'visible', timeout: 20000 })
  await window.screenshot({ path: path.join(home, 'cross-mode-passed.png') })
  process.stdout.write(`PASS: one saved Custom profile used by Editor and Workflow; mode switch during running job; 2 provider calls; 2 indexed videos. Project ${projectId}.\n`)
} catch (error) {
  if (app) {
    try {
      const window = await app.firstWindow({ timeout: 1000 })
      await window.screenshot({ path: path.join(home, 'cross-mode-error.png') })
      const status = await window.evaluate(() => window.electronAPI.getWorkflowEngineStatus()).catch(() => null)
      process.stderr.write(`Engine status: ${JSON.stringify(status)}\n`)
    } catch { /* Keep the original failure. */ }
  }
  throw error
} finally {
  if (app) await app.close()
  await new Promise(resolve => mock.close(resolve))
}

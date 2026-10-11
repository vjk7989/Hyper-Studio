import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = path.resolve(process.env.HYPER_STUDIO_SMOKE_EXE || '')
const shared = path.resolve(process.env.HYPER_STUDIO_SMOKE_SHARED || path.join(root, '.local-tmp', 'packaged-electron-smoke', 'shared-storage'))
if (!executablePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(executablePath)) {
  throw new Error('Set HYPER_STUDIO_SMOKE_EXE to an installed executable inside this repository')
}
if (!shared.startsWith(`${root}${path.sep}`) || !fs.existsSync(shared)) {
  throw new Error('Set HYPER_STUDIO_SMOKE_SHARED to an installed-runtime shared folder inside this repository')
}
const home = path.join(root, '.local-tmp', `mode-switch-timing-${Date.now()}`)
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) {
  fs.mkdirSync(folder, { recursive: true })
}
const env = {
  ...process.env,
  HOME: home, USERPROFILE: home, APPDATA: path.join(home, 'appdata'),
  LOCALAPPDATA: path.join(home, 'localappdata'), TEMP: path.join(home, 'temp'),
  TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
}
const launchedAt = performance.now()
const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], timeout: 120000 })
const timings = { coldWindowMs: null, firstRunReadyMs: null, firstWorkflowMs: null, warmSwitchMs: [] }
try {
  const window = await app.firstWindow({ timeout: 45000 })
  await window.waitForLoadState('domcontentloaded')
  timings.coldWindowMs = Math.round(performance.now() - launchedAt)
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await window.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped({ skipped: true }))
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
  timings.firstRunReadyMs = Math.round(performance.now() - launchedAt)

  const projectFolder = path.join(home, 'timing-project')
  fs.mkdirSync(projectFolder, { recursive: true })
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, projectFolder)
  await window.getByTestId('new-project-card').click()
  await window.getByPlaceholder('Project name').fill('Switch timing')
  await window.getByText('Choose a folder', { exact: true }).click()
  // The native folder picker resolves asynchronously. Clicking Create waits
  // for its enabled state after the chosen folder reaches React state.
  await window.getByRole('button', { name: 'Create', exact: true }).click()

  const editor = window.getByRole('button', { name: 'Editor', exact: true }).first()
  const workflow = window.getByRole('button', { name: 'Workflow', exact: true }).first()
  await editor.waitFor({ state: 'visible', timeout: 30000 })
  const canvas = window.frameLocator('iframe[title="Hyper-Studio workflow canvas"]')
  const workflowReady = async () => {
    await workflow.waitFor({ state: 'visible', timeout: 30000 })
    await window.getByRole('button', { name: 'Save', exact: true }).waitFor({ state: 'visible', timeout: 120000 })
    await window.getByRole('button', { name: 'Save', exact: true }).isEnabled({ timeout: 120000 })
    await canvas.locator('#graph-canvas').waitFor({ state: 'visible', timeout: 120000 })
    await window.waitForFunction(() => {
      const save = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Save')
      return save && !save.disabled
    }, null, { timeout: 120000 })
  }
  const editorReady = async () => {
    await editor.waitFor({ state: 'visible', timeout: 30000 })
    await window.getByRole('tab', { name: 'Video Editor' }).waitFor({ state: 'visible', timeout: 30000 })
  }
  const firstAt = performance.now()
  await workflow.click()
  await workflowReady()
  timings.firstWorkflowMs = Math.round(performance.now() - firstAt)
  const firstProjectId = (await window.evaluate(() => window.electronAPI.getWorkflowEngineStatus())).projectId

  const snapshot = async () => window.evaluate(async () => {
    const frame = document.querySelector('iframe[title="Hyper-Studio workflow canvas"]')
    const target = frame?.contentWindow
    if (!target) throw new Error('Workflow iframe is missing')
    const origin = new URL(frame.src).origin
    const requestId = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { window.removeEventListener('message', onMessage); reject(new Error('Workflow snapshot timed out')) }, 12000)
      const onMessage = event => {
        if (event.source !== target || event.origin !== origin || event.data?.type !== 'hyper-studio:workflow-snapshot' || event.data.requestId !== requestId) return
        clearTimeout(timer)
        window.removeEventListener('message', onMessage)
        event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.workflow)
      }
      window.addEventListener('message', onMessage)
      target.postMessage({ type: 'hyper-studio:request-workflow', requestId }, origin)
    })
  })
  const initial = await snapshot()
  await canvas.getByTestId('node-library-tab-button').click()
  await canvas.getByPlaceholder('Search...').fill('EmptyImage')
  await canvas.getByText('Empty Image', { exact: true }).last().dblclick()
  const unsaved = await snapshot()
  if (unsaved.nodes.length <= initial.nodes.length) throw new Error('Could not create an unsaved Workflow node')
  const unsavedIds = unsaved.nodes.map(node => node.id).sort()

  for (let index = 0; index < 10; index++) {
    const target = index % 2 === 0 ? editor : workflow
    const startedAt = performance.now()
    await target.click()
    if (index % 2 === 0) await editorReady()
    else await workflowReady()
    timings.warmSwitchMs.push(Math.round(performance.now() - startedAt))
  }
  const afterSwitches = await snapshot()
  if (JSON.stringify(afterSwitches.nodes.map(node => node.id).sort()) !== JSON.stringify(unsavedIds)) {
    throw new Error('Unsaved Workflow node IDs changed across mode switches')
  }
  timings.unsavedWorkflowIdsPreserved = true
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.waitForFunction(async () => (await window.electronAPI.getWorkflowEngineStatus()).state === 'stopped', null, { timeout: 10000 })
  timings.engineStoppedAfterProjectClose = true
  await window.getByTestId('new-project-card').waitFor({ state: 'visible' })
  const secondFolder = path.join(home, 'isolated-project')
  fs.mkdirSync(secondFolder, { recursive: true })
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, secondFolder)
  await window.getByTestId('new-project-card').click()
  await window.getByPlaceholder('Project name').fill('Isolated workflow')
  await window.getByText('Workflow mode', { exact: true }).click()
  await window.getByText('Choose a folder', { exact: true }).click()
  await window.getByPlaceholder('Project name').press('Enter')
  await window.waitForFunction(async previousId => {
    const status = await window.electronAPI.getWorkflowEngineStatus()
    return status.state === 'running' && status.projectId !== previousId
  }, firstProjectId, { timeout: 120000 })
  await window.getByRole('button', { name: 'Shared files (0)' }).waitFor({ state: 'visible', timeout: 30000 })
  timings.secondProjectIsolated = true
  const sorted = [...timings.warmSwitchMs].sort((a, b) => a - b)
  timings.warmP95Ms = sorted[Math.ceil(sorted.length * 0.95) - 1]
  timings.passesWarmTarget = timings.warmP95Ms <= 1000
  const output = path.join(home, 'timings.json')
  fs.writeFileSync(output, JSON.stringify(timings, null, 2))
  process.stdout.write(`${JSON.stringify({ ...timings, evidence: output })}\n`)
  if (!timings.passesWarmTarget) process.exitCode = 1
} finally {
  await app.evaluate(({ BrowserWindow }) => { for (const liveWindow of BrowserWindow.getAllWindows()) liveWindow.destroy() })
  await app.close()
}

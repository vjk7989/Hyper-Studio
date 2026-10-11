import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const reviewedUrl = 'https://github.com/ltdrdata/ComfyUI-Impact-Pack'
const packId = 'comfyui-impact-pack'
const nodeId = 90909
const home = path.resolve(process.env.HYPER_STUDIO_MANAGER_SMOKE_HOME || path.join(root, '.local-tmp', `manager-install-smoke-${Date.now()}`))
const shared = path.resolve(process.env.HYPER_STUDIO_MANAGER_SMOKE_SHARED || path.join(home, 'shared-storage'))
const executablePath = path.resolve(process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe'))
const insideRepo = target => target.startsWith(`${root}${path.sep}`)
if (![home, shared, executablePath].every(insideRepo)) throw new Error('Manager smoke paths must remain inside the repository')
if (!fs.existsSync(executablePath)) throw new Error('Build or install the Windows app first')
if (fs.existsSync(home)) throw new Error(`Use a fresh manager smoke home: ${home}`)
if (fs.existsSync(path.join(shared, 'extensions', 'workflow', packId))) throw new Error('Fixture node pack is already installed in shared storage')

for (const dir of [home, shared, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) fs.mkdirSync(dir, { recursive: true })
const fixtureSource = path.join(home, 'fixture-source')
fs.mkdirSync(fixtureSource)
fs.copyFileSync(path.join(root, 'scripts', 'fixtures', 'manager-impact-int', '__init__.py'), path.join(fixtureSource, '__init__.py'))
const git = (args, env = process.env) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8', timeout: 15000 }).trim()
git(['init', '-q', fixtureSource])
git(['-C', fixtureSource, 'add', '__init__.py'])
git(['-C', fixtureSource, '-c', 'user.name=Hyper-Studio Smoke', '-c', 'user.email=smoke@localhost', 'commit', '-qm', 'Local ImpactInt fixture'])
const fixtureCommit = git(['-C', fixtureSource, 'rev-parse', 'HEAD'])
const fixtureUrl = `file://${fixtureSource.replaceAll('\\', '/')}`
const gitEnv = {
  GIT_CONFIG_COUNT: '2',
  GIT_CONFIG_KEY_0: `url.${fixtureUrl}.insteadOf`,
  GIT_CONFIG_VALUE_0: reviewedUrl,
  GIT_CONFIG_KEY_1: 'http.proxy',
  GIT_CONFIG_VALUE_1: 'http://127.0.0.1:9',
  GIT_TERMINAL_PROMPT: '0',
  CM_USE_PYGIT2: '0',
  HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9',
  ALL_PROXY: 'http://127.0.0.1:9', NO_PROXY: '127.0.0.1,localhost,::1',
  http_proxy: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9',
  all_proxy: 'http://127.0.0.1:9', no_proxy: '127.0.0.1,localhost,::1'
}
if (!git(['ls-remote', reviewedUrl, 'HEAD'], { ...process.env, ...gitEnv }).startsWith(fixtureCommit)) {
  throw new Error('Exact reviewed URL did not resolve to the repository-local fixture')
}
process.stdout.write('PASS: exact reviewed Git URL resolves to local fixture; test-only Git proxy blocks other HTTP clones\n')

const appEnv = {
  ...process.env,
  ...gitEnv,
  HOME: home, USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'), LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  HYPER_STUDIO_WORKFLOW_TRACE: '1'
}
const app = await electron.launch({ executablePath, cwd: root, env: appEnv, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], timeout: 120000 })
try {
  const window = await app.firstWindow({ timeout: 45000 })
  const blockedRequests = []
  await window.route(/^https?:\/\//, route => {
    const target = new URL(route.request().url())
    if (['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) return route.continue()
    blockedRequests.push(target.origin)
    return route.abort()
  })
  await window.waitForLoadState('domcontentloaded', { timeout: 45000 })
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await window.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped({ skipped: true }))
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
  const projectFolder = path.join(home, 'project')
  fs.mkdirSync(projectFolder)
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, projectFolder)
  await window.getByTestId('new-project-card').click()
  await window.getByPlaceholder('Project name').fill('Manager fixture smoke')
  await window.getByText('Editor mode', { exact: true }).click()
  await window.getByText('Choose a folder', { exact: true }).click()
  await window.getByRole('button', { name: 'Create', exact: true }).click()
  try {
    await window.getByRole('button', { name: 'Workflow', exact: true }).last().waitFor({ state: 'visible', timeout: 30000 })
  } catch (error) {
    await window.screenshot({ path: path.join(home, 'project-create-failed.png') })
    throw new Error(`Editor project creation did not open: ${String(error)}; body ${(await window.locator('body').innerText()).slice(0, 1200)}`)
  }
  // Create the project from an empty folder, then preseed the manager config
  // before entering Workflow mode. This keeps first startup offline.
  const managerConfig = path.join(projectFolder, '.hyper-studio', 'workflow', 'user', '__manager')
  fs.mkdirSync(managerConfig, { recursive: true })
  fs.writeFileSync(path.join(managerConfig, 'config.ini'), '[default]\nnetwork_mode = offline\nsecurity_level = normal\n')
  await window.getByRole('button', { name: 'Workflow', exact: true }).last().click()
  const iframe = window.locator('iframe[title="Hyper-Studio workflow canvas"]')
  await iframe.waitFor({ state: 'visible', timeout: 300000 })
  const canvas = window.frameLocator('iframe[title="Hyper-Studio workflow canvas"]')
  await canvas.locator('#graph-canvas').waitFor({ state: 'visible', timeout: 45000 })
  await window.waitForTimeout(1500)
  const engine = await window.evaluate(() => window.electronAPI.getWorkflowEngineStatus())
  if (engine.state !== 'running' || !engine.url || !engine.projectId) throw new Error(`Managed engine did not start: ${JSON.stringify(engine)}`)
  const origin = new URL(engine.url).origin
  const managerVersion = await fetch(new URL('v2/manager/version', engine.url))
  if (!managerVersion.ok) throw new Error(`Manager was not enabled: ${managerVersion.status}`)
  const snapshot = () => window.evaluate(async targetOrigin => {
    const target = document.querySelector('iframe[title="Hyper-Studio workflow canvas"]')?.contentWindow
    if (!target) throw new Error('Workflow iframe is missing')
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID()
      const timeout = setTimeout(() => reject(new Error('Canvas bridge timed out')), 12000)
      const onMessage = event => {
        if (event.source !== target || event.origin !== targetOrigin || event.data?.type !== 'hyper-studio:workflow-snapshot' || event.data.requestId !== requestId) return
        clearTimeout(timeout)
        window.removeEventListener('message', onMessage)
        event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.workflow)
      }
      window.addEventListener('message', onMessage)
      target.postMessage({ type: 'hyper-studio:request-workflow', requestId }, targetOrigin)
    })
  }, origin)
  const workflow = structuredClone(await snapshot())
  workflow.nodes.push({
    id: nodeId, type: 'ImpactInt', pos: [400, 400], size: [240, 80], flags: {}, order: workflow.nodes.length,
    mode: 0, inputs: [], outputs: [], properties: { cnr_id: packId }, widgets_values: [42]
  })
  workflow.last_node_id = Math.max(Number(workflow.last_node_id) || 0, nodeId)
  const workflowPath = path.join(home, 'missing-impact-int.json')
  fs.writeFileSync(workflowPath, JSON.stringify(workflow))
  await app.evaluate(({ dialog }, source) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] }) }, workflowPath)
  await window.getByRole('button', { name: 'Import', exact: true }).click()
  await window.waitForTimeout(1500)
  for (let attempt = 0; attempt < 40; attempt++) {
    const loaded = await snapshot()
    if (loaded.nodes.some(node => node.id === nodeId && node.type === 'ImpactInt')) break
    if (attempt === 39) {
      fs.writeFileSync(path.join(home, 'import-snapshot-failed.json'), JSON.stringify(loaded, null, 2))
      await window.screenshot({ path: path.join(home, 'import-snapshot-failed.png') })
      throw new Error('Imported node ID was lost before installation')
    }
    await window.waitForTimeout(250)
  }
  const templateGallery = canvas.locator('[data-dialog-key="global-workflow-template-selector"]')
  if (await templateGallery.isVisible()) await templateGallery.getByRole('button', { name: /close dialog/i }).click()
  await canvas.getByRole('button', { name: 'Toggle properties panel' }).click({ timeout: 5000 })
  await canvas.getByTestId('panel-tab-errors').click({ timeout: 5000 })
  const installButton = canvas.getByTestId('missing-node-card').getByText('Install', { exact: true }).first()
  await installButton.waitFor({ state: 'visible', timeout: 20000 })
  const installedPath = path.join(shared, 'extensions', 'workflow', packId)
  let installRequestCount = 0
  let task = null
  window.on('request', request => {
    if (/\/v2\/manager\/queue\/task(?:\?|$)/.test(request.url())) {
      installRequestCount++
      task = JSON.parse(request.postData() || '{}')
    }
  })
  await installButton.click()
  const installReview = canvas.locator('[data-dialog-key="hyper-studio-node-pack-install-review"]')
  await installReview.waitFor({ state: 'visible', timeout: 10000 })
  const reviewText = await installReview.innerText()
  if (!reviewText.includes('ComfyUI Impact Pack') || !reviewText.includes(reviewedUrl)) throw new Error('Review did not show the pack name and exact source')
  if (installRequestCount || fs.existsSync(installedPath)) throw new Error('Install started before explicit review confirmation')
  await window.screenshot({ path: path.join(home, 'install-review.png') })
  const cancel = installReview.getByRole('button', { name: 'Cancel', exact: true })
  const confirm = installReview.getByRole('button', { name: 'Confirm', exact: true })
  if (await cancel.count() !== 1 || await confirm.count() !== 1) {
    const accessibleControls = await installReview.ariaSnapshot()
    fs.writeFileSync(path.join(home, 'install-review-accessibility.txt'), accessibleControls)
    throw new Error('Review buttons must have accessible names Cancel and Confirm; see install-review-accessibility.txt')
  }
  await cancel.click()
  await installReview.waitFor({ state: 'hidden' })
  if (installRequestCount || fs.existsSync(installedPath)) throw new Error('Canceling install review started the Manager task')
  process.stdout.write('PASS: canceled third-party-node review leaves Manager queue and shared storage untouched\n')
  await installButton.click()
  await installReview.waitFor({ state: 'visible', timeout: 10000 })
  await confirm.click({ timeout: 5000 })
  for (let attempt = 0; attempt < 40 && !task; attempt++) await window.waitForTimeout(250)
  if (installRequestCount !== 1 || task?.kind !== 'install' || task.params?.id !== packId || task.params?.mode !== 'local' || task.params?.selected_version !== 'nightly' || task.params?.repository !== reviewedUrl) {
    throw new Error(`Reviewed manager task mismatch: ${JSON.stringify(task)}`)
  }
  process.stdout.write('PASS: reviewed UI submitted one real Manager install task\n')
  // The live history can be cleared as soon as a batch is finalized. Its
  // project-owned batch file is the durable completion record.
  const batchHistory = path.join(projectFolder, '.hyper-studio', 'workflow', 'user', '__manager', 'batch_history')
  const waitForBatch = async uiId => {
    for (let attempt = 0; attempt < 240; attempt++) {
      if (fs.existsSync(batchHistory)) {
        for (const file of fs.readdirSync(batchHistory).filter(name => name.endsWith('.json'))) {
          let batch
          try { batch = JSON.parse(fs.readFileSync(path.join(batchHistory, file), 'utf8')) } catch { continue }
          const operation = batch.operations?.find(item => item.operation_id === uiId)
          if (operation) return { batch, operation }
        }
      }
      await window.waitForTimeout(500)
    }
    throw new Error(`Manager task ${uiId} did not complete within two minutes`)
  }
  const completed = await waitForBatch(task.ui_id)
  if (completed?.operation?.result !== 'success' || completed.batch.failed_operations !== 0) {
    throw new Error(`Manager install did not succeed: ${JSON.stringify(completed)}`)
  }
  if (!fs.existsSync(path.join(installedPath, '__init__.py'))) throw new Error(`Manager did not install fixture under shared storage: ${installedPath}`)
  if (git(['-C', installedPath, 'rev-parse', 'HEAD']) !== fixtureCommit) throw new Error('Installed node does not match local fixture commit')
  process.stdout.write('PASS: Manager queue completed and installed exact local fixture commit under shared storage\n')
  const stopped = await window.evaluate(() => window.electronAPI.stopWorkflowEngine())
  if (stopped.state !== 'stopped') throw new Error(`Managed engine stop failed: ${JSON.stringify(stopped)}`)
  const restarted = await window.evaluate(projectId => window.electronAPI.startWorkflowEngine({ projectId }), engine.projectId)
  if (restarted.state !== 'running' || !restarted.url) throw new Error(`Managed engine restart failed: ${JSON.stringify(restarted)}`)
  const objectInfo = await (await fetch(new URL('object_info', restarted.url))).json()
  if (!objectInfo.ImpactInt) throw new Error('ImpactInt was not registered after managed engine restart')
  await window.getByRole('button', { name: 'Editor', exact: true }).last().click()
  await window.getByRole('button', { name: 'Workflow', exact: true }).last().click()
  await iframe.waitFor({ state: 'visible', timeout: 45000 })
  await canvas.locator('#graph-canvas').waitFor({ state: 'visible', timeout: 45000 })
  await app.evaluate(({ dialog }, source) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [source] }) }, workflowPath)
  await window.getByRole('button', { name: 'Import', exact: true }).click()
  await window.waitForFunction(() => /^missing-impact-int.*\.json$/.test(document.querySelector('input[aria-label="Workflow filename"]')?.value || ''), null, { timeout: 10000 })
  // Import stores the file even when the iframe has not yet emitted its load
  // event. Open waits for the host bridge to be ready and sends it explicitly.
  await window.getByRole('button', { name: 'Open', exact: true }).click({ timeout: 45000 })
  const afterRestartOrigin = new URL(restarted.url).origin
  let restored = null
  for (let attempt = 0; attempt < 40; attempt++) {
    restored = await window.evaluate(async targetOrigin => {
      const target = document.querySelector('iframe[title="Hyper-Studio workflow canvas"]')?.contentWindow
      return new Promise((resolve, reject) => {
        const requestId = crypto.randomUUID()
        const timeout = setTimeout(() => reject(new Error('Canvas bridge timed out')), 12000)
        const onMessage = event => {
          if (event.source !== target || event.origin !== targetOrigin || event.data?.type !== 'hyper-studio:workflow-snapshot' || event.data.requestId !== requestId) return
          clearTimeout(timeout)
          window.removeEventListener('message', onMessage)
          event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.workflow)
        }
        window.addEventListener('message', onMessage)
        target.postMessage({ type: 'hyper-studio:request-workflow', requestId }, targetOrigin)
      })
    }, afterRestartOrigin)
    if (restored?.nodes?.some(node => node.id === nodeId && node.type === 'ImpactInt')) break
    await window.waitForTimeout(250)
  }
  if (!restored?.nodes?.some(node => node.id === nodeId && node.type === 'ImpactInt')) {
    fs.writeFileSync(path.join(home, 'post-restart-snapshot-failed.json'), JSON.stringify(restored, null, 2))
    await window.screenshot({ path: path.join(home, 'post-restart-snapshot-failed.png') })
    throw new Error(`Canvas lost imported ImpactInt ID after restart; workflow input=${await window.locator('input[aria-label="Workflow filename"]').inputValue()}; body=${(await window.locator('body').innerText()).slice(0, 1200)}`)
  }
  await window.screenshot({ path: path.join(home, 'installed-node-after-restart.png') })
  process.stdout.write('PASS: managed engine restart registered ImpactInt and canvas retained imported node ID 90909\n')

  // The installed nightly pack exposes Try Update. Advance the local origin
  // after installation so the update has a real commit to fetch offline.
  fs.appendFileSync(path.join(fixtureSource, '__init__.py'), '\n# Updated by local Manager smoke fixture.\n')
  git(['-C', fixtureSource, 'add', '__init__.py'])
  git(['-C', fixtureSource, '-c', 'user.name=Hyper-Studio Smoke', '-c', 'user.email=smoke@localhost', 'commit', '-qm', 'Local fixture update'])
  const updateCommit = git(['-C', fixtureSource, 'rev-parse', 'HEAD'])
  if (updateCommit === fixtureCommit) throw new Error('Local update fixture did not advance')

  await window.getByRole('button', { name: 'Extensions', exact: true }).click()
  const manager = canvas.locator('.manager-dialog')
  await manager.waitFor({ state: 'visible', timeout: 10000 })
  await manager.locator('input').first().fill('Impact')
  const packCard = manager.getByText('ComfyUI Impact Pack', { exact: true }).first()
  await packCard.waitFor({ state: 'visible', timeout: 15000 })
  await packCard.click()
  const updateButton = manager.getByRole('button', { name: 'Try Update', exact: true })
  await updateButton.waitFor({ state: 'visible', timeout: 15000 })
  const submittedTasks = []
  window.on('request', request => {
    if (/\/v2\/manager\/queue\/task(?:\?|$)/.test(request.url())) submittedTasks.push(JSON.parse(request.postData() || '{}'))
  })
  await updateButton.click()
  for (let attempt = 0; attempt < 40 && submittedTasks.length < 1; attempt++) await window.waitForTimeout(250)
  const updateTask = submittedTasks[0]
  if (submittedTasks.length !== 1 || updateTask?.kind !== 'update' || updateTask.params?.node_name !== packId || updateTask.params?.node_ver !== 'nightly') {
    throw new Error(`Manager update task mismatch: ${JSON.stringify(submittedTasks)}`)
  }
  const updated = await waitForBatch(updateTask.ui_id)
  if (updated.operation.result !== 'success' || updated.batch.failed_operations !== 0) {
    throw new Error(`Manager update failed: ${JSON.stringify(updated)}`)
  }
  if (git(['-C', installedPath, 'rev-parse', 'HEAD']) !== updateCommit) throw new Error('Installed node did not advance to the local update commit')
  process.stdout.write('PASS: Manager updated the installed pack to the next local fixture commit\n')

  const uninstallButton = manager.getByRole('button', { name: 'Uninstall', exact: true })
  await uninstallButton.waitFor({ state: 'visible', timeout: 15000 })
  await uninstallButton.click()
  for (let attempt = 0; attempt < 40 && submittedTasks.length < 2; attempt++) await window.waitForTimeout(250)
  const uninstallTask = submittedTasks[1]
  if (submittedTasks.length !== 2 || uninstallTask?.kind !== 'uninstall' || uninstallTask.params?.node_name !== packId || uninstallTask.params?.is_unknown !== false) {
    throw new Error(`Manager uninstall task mismatch: ${JSON.stringify(submittedTasks)}`)
  }
  const uninstalled = await waitForBatch(uninstallTask.ui_id)
  if (uninstalled.operation.result !== 'success' || uninstalled.batch.failed_operations !== 0 || fs.existsSync(installedPath)) {
    throw new Error(`Manager uninstall failed or left the fixture installed: ${JSON.stringify(uninstalled)}`)
  }
  process.stdout.write('PASS: Manager uninstalled the fixture from shared storage\n')
  if (blockedRequests.length) throw new Error(`Renderer attempted external requests: ${blockedRequests.join(', ')}`)
  process.stdout.write('PASS: Manager smoke made no external renderer request\n')
} finally {
  await app.close()
}

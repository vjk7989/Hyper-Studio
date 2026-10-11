import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const home = path.join(root, '.local-tmp', `workflow-control-smoke-${Date.now()}`)
const shared = path.join(root, '.local-tmp', 'packaged-electron-smoke-project-controls', 'shared-storage')
const executablePath = path.resolve(process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe'))
assert.ok(executablePath.startsWith(`${root}${path.sep}`) && fs.existsSync(executablePath), 'Use an existing repository-local packaged executable')
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) fs.mkdirSync(folder, { recursive: true })
const originalIds = [17, 29]
const fixture = {
  last_node_id: 29, last_link_id: 0,
  nodes: [
    { id: 17, type: 'EmptyImage', pos: [100, 150], size: [270, 130], flags: {}, order: 0, mode: 0, inputs: [], outputs: [{ name: 'IMAGE', type: 'IMAGE', links: null }], properties: { 'Node name for S&R': 'EmptyImage' }, widgets_values: [64, 64, 1, 0] },
    { id: 29, type: 'SaveImage', pos: [500, 150], size: [270, 58], flags: {}, order: 1, mode: 0, inputs: [{ name: 'images', type: 'IMAGE', link: null }], outputs: [], properties: { 'Node name for S&R': 'SaveImage' }, widgets_values: ['workflow-control-ui'] },
  ],
  links: [], groups: [], config: {}, extra: { ds: { scale: 1, offset: [0, 0] } }, version: 0.4,
}
const source = path.join(home, 'unlinked-local.json')
fs.writeFileSync(source, JSON.stringify(fixture))
const env = {
  ...process.env, HOME: home, USERPROFILE: home, APPDATA: path.join(home, 'appdata'),
  LOCALAPPDATA: path.join(home, 'localappdata'), TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'),
  TMPDIR: path.join(home, 'temp'), HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  ELECTRON_ENABLE_LOGGING: '1', ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
}
const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], timeout: 120000 })
const log = (...values) => process.stdout.write(`${values.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ')}\n`)
log('HOME', home)

try {
  const window = await app.firstWindow({ timeout: 45000 })
  await window.waitForLoadState('domcontentloaded')
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await window.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped?.({ skipped: true }))
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
  const projectFolder = path.join(home, 'workflow-project')
  fs.mkdirSync(projectFolder, { recursive: true })
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, projectFolder)
  await window.getByTestId('new-project-card').click()
  await window.getByPlaceholder('Project name').fill('Workflow controls')
  await window.getByText('Workflow mode', { exact: true }).click()
  await window.getByText('Choose a folder', { exact: true }).click()
  await window.getByRole('button', { name: 'Create', exact: true }).click()

  const iframe = window.locator('iframe[title="Hyper-Studio workflow canvas"]')
  try {
    await iframe.waitFor({ state: 'visible', timeout: 60000 })
  } catch (error) {
    log('WORKFLOW STARTUP BODY', (await window.locator('body').innerText()).slice(0, 3000))
    await window.screenshot({ path: path.join(home, 'workflow-open-failed.png') }).catch(() => {})
    throw error
  }
  const frame = await (await iframe.elementHandle()).contentFrame()
  assert.ok(frame, 'Workflow iframe must have a live frame')
  await frame.locator('#graph-canvas').waitFor({ state: 'visible', timeout: 45000 })
  // The DOM canvas can appear before the graph initializes. Require the
  // actual editing surface before exercising import and host snapshots.
  await frame.waitForFunction(() => !!window.app?.graph && !!window.app?.canvas?.graph, undefined, { timeout: 30000 })
  const engine = await window.evaluate(() => window.electronAPI.getWorkflowEngineStatus())
  assert.equal(engine.state, 'running', 'Managed workflow engine must be running')
  const snapshot = async () => window.evaluate(async origin => {
    const target = document.querySelector('iframe[title="Hyper-Studio workflow canvas"]')?.contentWindow
    return await new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID()
      const timeout = setTimeout(() => reject(new Error('snapshot timeout')), 12000)
      const onMessage = event => {
        if (event.source !== target || event.origin !== origin || event.data?.type !== 'hyper-studio:workflow-snapshot' || event.data.requestId !== requestId) return
        clearTimeout(timeout); window.removeEventListener('message', onMessage)
        event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.workflow)
      }
      window.addEventListener('message', onMessage)
      target.postMessage({ type: 'hyper-studio:request-workflow', requestId }, origin)
    })
  }, new URL(engine.url).origin)

  await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }) }, source)
  await window.getByRole('button', { name: 'Import', exact: true }).click()
  const importedPath = path.join(projectFolder, 'workflows', 'unlinked-local.json')
  for (let i = 0; i < 80 && !fs.existsSync(importedPath); i++) await window.waitForTimeout(250)
  assert.ok(fs.existsSync(importedPath), 'Import must copy workflow JSON into the project')
  assert.deepEqual(JSON.parse(fs.readFileSync(importedPath, 'utf8')).nodes.map(node => node.id), originalIds)
  let imported
  for (let i = 0; i < 80; i++) {
    imported = await snapshot()
    if (imported.nodes?.map(node => node.id).join(',') === originalIds.join(',')) break
    await window.waitForTimeout(250)
  }
  assert.deepEqual(imported.nodes.map(node => node.id), originalIds, 'Import must preserve original node IDs')
  assert.equal(imported.links.length, 0, 'Fixture must begin without a connection')
  log('PASS import and original node IDs', originalIds)

  // LiteGraph supplies port coordinates. Only Playwright mouse input creates the link.
  const ports = await frame.evaluate(() => {
    const graphCanvas = window.app?.canvas
    const graph = graphCanvas?.graph
    const from = graph?.getNodeById(17)?.getConnectionPos(false, 0)
    const to = graph?.getNodeById(29)?.getConnectionPos(true, 0)
    if (!from || !to) throw new Error('Fixture node ports unavailable')
    const rect = document.querySelector('#graph-canvas').getBoundingClientRect()
    const point = port => {
      const local = graphCanvas.convertOffsetToCanvas(port)
      return { x: rect.left + local[0], y: rect.top + local[1] }
    }
    return { from: point(from), to: point(to) }
  })
  const frameBounds = await iframe.boundingBox()
  assert.ok(frameBounds, 'Workflow iframe must be visible for mouse input')
  const absolute = point => ({ x: frameBounds.x + point.x, y: frameBounds.y + point.y })
  const from = absolute(ports.from), to = absolute(ports.to)
  await window.mouse.move(from.x, from.y)
  await window.mouse.down()
  await window.mouse.move(to.x, to.y, { steps: 20 })
  await window.mouse.up()
  const wired = await snapshot()
  assert.equal(wired.links.length, 1, 'Mouse drag must create one graph link')
  assert.deepEqual(wired.links[0].slice(1, 5), [17, 0, 29, 0], 'Link must join the selected ports')
  assert.deepEqual(wired.nodes.map(node => node.id), originalIds)
  log('PASS mouse port wiring', wired.links[0])

  await window.getByRole('button', { name: 'Save', exact: true }).click()
  const savedPath = importedPath
  for (let i = 0; i < 80; i++) {
    if (fs.existsSync(savedPath) && JSON.parse(fs.readFileSync(savedPath, 'utf8')).links.length === 1) break
    await window.waitForTimeout(250)
  }
  assert.ok(fs.existsSync(savedPath), 'Save must update the imported workflow in the project')
  const saved = JSON.parse(fs.readFileSync(savedPath, 'utf8'))
  assert.deepEqual(saved.nodes.map(node => node.id), originalIds, 'Save must preserve original node IDs')
  assert.deepEqual(saved.links[0].slice(1, 5), [17, 0, 29, 0])
  await window.getByRole('button', { name: 'Open', exact: true }).click()
  const exportedPath = path.join(home, 'workflow-export.json')
  await app.evaluate(({ dialog }, filePath) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath }) }, exportedPath)
  await window.getByRole('button', { name: 'Export', exact: true }).click()
  for (let i = 0; i < 80 && !fs.existsSync(exportedPath); i++) await window.waitForTimeout(250)
  assert.ok(fs.existsSync(exportedPath), 'Export must write workflow JSON')
  const exported = JSON.parse(fs.readFileSync(exportedPath, 'utf8'))
  assert.deepEqual(exported.nodes.map(node => node.id), originalIds, 'Export must preserve original node IDs')
  assert.deepEqual(exported.links[0].slice(1, 5), [17, 0, 29, 0])
  log('PASS import, save, export JSON roundtrip and IDs')

  // Repeated tiny images keep the active cancel control available without models.
  const batch = frame.getByRole('textbox', { name: 'Batch Count' })
  await batch.fill('100')
  await batch.press('Enter')
  await frame.getByTestId('queue-button').click()
  const cancel = frame.getByRole('button', { name: 'Cancel current run' })
  let active = false
  for (let i = 0; i < 100; i++) {
    if (await cancel.isEnabled()) { active = true; break }
    await window.waitForTimeout(100)
  }
  assert.ok(active, 'Cancel must become enabled during an active run')
  const interruptResponse = window.waitForResponse(response => new URL(response.url()).pathname.endsWith('/interrupt') && response.request().method() === 'POST', { timeout: 15000 })
  await cancel.click()
  assert.equal((await interruptResponse).status(), 200, 'Active cancel must reach the managed engine')
  log('PASS active queue cancel reached managed engine')
  log('ENGINE', engine)
} finally {
  await app.evaluate(({ BrowserWindow }) => {
    for (const liveWindow of BrowserWindow.getAllWindows()) liveWindow.destroy()
  })
  await app.close()
}

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const home = path.join(root, '.local-tmp', `workflow-widget-undo-${Date.now()}`)
const shared = path.resolve(process.env.HYPER_STUDIO_SMOKE_SHARED || path.join(root, '.local-tmp', 'packaged-electron-smoke-project-controls', 'shared-storage'))
const executablePath = path.resolve(process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe'))
assert.ok(executablePath.startsWith(`${root}${path.sep}`) && fs.existsSync(executablePath), 'Use an existing repository-local packaged executable')
assert.ok(shared.startsWith(`${root}${path.sep}`) && fs.existsSync(path.join(shared, 'runtimes', 'workflow')), 'Use an installed repository-local workflow runtime')
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) fs.mkdirSync(folder, { recursive: true })

const nodeIds = [17, 29]
const fixture = {
  last_node_id: 29, last_link_id: 1,
  nodes: [
    { id: 17, type: 'EmptyImage', pos: [100, 150], size: [270, 130], flags: {}, order: 0, mode: 0, inputs: [], outputs: [{ name: 'IMAGE', type: 'IMAGE', links: [1] }], properties: { 'Node name for S&R': 'EmptyImage' }, widgets_values: [64, 64, 1, 0] },
    { id: 29, type: 'SaveImage', pos: [500, 150], size: [270, 58], flags: {}, order: 1, mode: 0, inputs: [{ name: 'images', type: 'IMAGE', link: 1 }], outputs: [], properties: { 'Node name for S&R': 'SaveImage' }, widgets_values: ['workflow-widget-undo'] },
  ],
  links: [[1, 17, 0, 29, 0, 'IMAGE']], groups: [], config: {}, extra: { ds: { scale: 1, offset: [0, 0] } }, version: 0.4,
}
const source = path.join(home, 'widget-undo.json')
fs.writeFileSync(source, JSON.stringify(fixture))
const env = {
  ...process.env, HOME: home, USERPROFILE: home, APPDATA: path.join(home, 'appdata'),
  LOCALAPPDATA: path.join(home, 'localappdata'), TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'),
  TMPDIR: path.join(home, 'temp'), HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  ELECTRON_ENABLE_LOGGING: '1', ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
}
const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], timeout: 120000 })
console.log('HOME', home)

try {
  const window = await app.firstWindow({ timeout: 45000 })
  await window.waitForLoadState('domcontentloaded')
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await window.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped?.({ skipped: true }))
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
  const projectFolder = path.join(home, 'project')
  fs.mkdirSync(projectFolder, { recursive: true })
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, projectFolder)
  await window.getByTestId('new-project-card').click()
  await window.getByPlaceholder('Project name').fill('Widget undo')
  await window.getByText('Workflow mode', { exact: true }).click()
  await window.getByText('Choose a folder', { exact: true }).click()
  await window.getByRole('button', { name: 'Create', exact: true }).click()

  const iframe = window.locator('iframe[title="Hyper-Studio workflow canvas"]')
  await iframe.waitFor({ state: 'visible', timeout: 60000 })
  const frame = await (await iframe.elementHandle()).contentFrame()
  assert.ok(frame, 'Workflow iframe must have a live frame')
  await frame.locator('#graph-canvas').waitFor({ state: 'visible', timeout: 45000 })
  await frame.waitForFunction(() => !!window.app?.graph && !!window.app?.canvas?.graph, undefined, { timeout: 30000 })
  const engine = await window.evaluate(() => window.electronAPI.getWorkflowEngineStatus())
  assert.equal(engine.state, 'running')
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
  let imported
  for (let i = 0; i < 80; i++) {
    imported = await snapshot()
    if (imported.nodes?.map(node => node.id).join(',') === nodeIds.join(',')) break
    await window.waitForTimeout(250)
  }
  if (imported.nodes?.map(node => node.id).join(',') !== nodeIds.join(',')) {
    console.log('IMPORT DIAGNOSTIC', JSON.stringify({
      openEnabled: await window.getByRole('button', { name: 'Open', exact: true }).isEnabled(),
      alert: await window.locator('[role="alert"]').allInnerTexts(),
      graphNodeIds: await frame.evaluate(() => window.app?.graph?._nodes?.map(node => node.id) ?? null),
    }))
  }
  assert.deepEqual(imported.nodes.map(node => node.id), nodeIds)
  assert.equal(imported.nodes[0].widgets_values[0], 64)
  // LiteGraph paints numeric widgets on canvas. Double-click their value to
  // open the real editor, then use keyboard input rather than changing graph state.
  const widgetPoint = await frame.evaluate(() => {
    const canvas = window.app.canvas
    const node = window.app.graph.getNodeById(17)
    const widget = node.widgets.find(candidate => candidate.name === 'width')
    const rect = document.querySelector('#graph-canvas').getBoundingClientRect()
    const [x, y] = canvas.convertOffsetToCanvas([node.pos[0] + node.size[0] * 0.79, node.pos[1] + widget.last_y + 10])
    return { x: rect.left + x, y: rect.top + y, size: node.size, pos: node.pos }
  })
  const bounds = await iframe.boundingBox()
  assert.ok(bounds)
  await window.mouse.dblclick(bounds.x + widgetPoint.x, bounds.y + widgetPoint.y)
  const width = frame.locator('input[type="text"]:visible').last()
  await width.waitFor({ state: 'visible', timeout: 15000 })
  assert.equal(await width.inputValue(), '64', 'Double-click must open the imported width widget')
  await width.fill('96')
  await width.press('Enter')
  let edited
  for (let i = 0; i < 40; i++) {
    edited = await snapshot()
    if (edited.nodes[0].widgets_values[0] === 96) break
    await window.waitForTimeout(100)
  }
  assert.equal(edited.nodes[0].widgets_values[0], 96, 'Widget edit must update the graph')
  assert.deepEqual(edited.nodes.map(node => node.id), nodeIds)
  console.log('PASS widget width edit through UI')

  await frame.locator('#graph-canvas').press('Control+z')
  let undone
  for (let i = 0; i < 40; i++) {
    undone = await snapshot()
    if (undone.nodes[0].widgets_values[0] === 64) break
    await window.waitForTimeout(100)
  }
  assert.equal(undone.nodes[0].widgets_values[0], 64, 'Undo must restore the prior widget value')
  assert.deepEqual(undone.nodes.map(node => node.id), nodeIds)
  console.log('PASS widget Undo through keyboard')

  await frame.locator('#graph-canvas').press('Control+Shift+z')
  let redone
  for (let i = 0; i < 40; i++) {
    redone = await snapshot()
    if (redone.nodes[0].widgets_values[0] === 96) break
    await window.waitForTimeout(100)
  }
  assert.equal(redone.nodes[0].widgets_values[0], 96, 'Redo must restore the edited widget value')
  assert.deepEqual(redone.nodes.map(node => node.id), nodeIds)
  console.log('PASS widget Redo through keyboard with IDs preserved')
} finally {
  await app.close()
}

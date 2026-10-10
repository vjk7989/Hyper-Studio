import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe')
if (!fs.existsSync(executablePath)) throw new Error('Build the Windows unpacked app first')
const home = path.join(root, '.local-tmp', 'workflow-compat-smoke')
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) {
  fs.mkdirSync(folder, { recursive: true })
}
const env = {
  ...process.env,
  HOME: home, USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'), LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
}
const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox'], timeout: 45000 })
try {
  const window = await app.firstWindow({ timeout: 45000 })
  await window.waitForLoadState('domcontentloaded', { timeout: 45000 })
  // Reuse the already bootstrapped managed runtime without sharing Electron user data.
  const shared = path.join(root, '.local-tmp', 'packaged-electron-smoke', 'shared-storage')
  fs.mkdirSync(shared, { recursive: true })
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.getByText('New Project', { exact: true }).waitFor({ state: 'visible', timeout: 30000 })
  const projectFolder = path.join(home, `workflow-project-${Date.now()}`)
  fs.mkdirSync(projectFolder, { recursive: true })
  await app.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] })
  }, projectFolder)
  await window.getByText('New Project', { exact: true }).click()
  await window.getByPlaceholder('Project name').fill('Compatibility smoke')
  await window.getByText('Workflow mode', { exact: true }).click()
  await window.getByText('Choose a folder', { exact: true }).click()
  await window.getByPlaceholder('Project name').press('Enter')
  const iframe = window.locator('iframe[title="Hyper-Studio workflow canvas"]')
  await iframe.waitFor({ state: 'visible', timeout: 45000 })
  const canvas = window.frameLocator('iframe[title="Hyper-Studio workflow canvas"]')
  await canvas.locator('#graph-canvas').waitFor({ state: 'visible', timeout: 45000 })
  await window.waitForTimeout(1500)
  const engine = await window.evaluate(() => window.electronAPI.getWorkflowEngineStatus())
  const origin = new URL(engine.url).origin
  const snapshot = async () => window.evaluate(async targetOrigin => {
    const target = document.querySelector('iframe[title="Hyper-Studio workflow canvas"]')?.contentWindow
    if (!target) throw new Error('Canvas iframe is missing')
    return await new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID()
      const timeout = setTimeout(() => reject(new Error('Canvas bridge did not answer')), 12000)
      const onMessage = event => {
        if (event.source !== target || event.origin !== targetOrigin || event.data?.type !== 'hyper-studio:workflow-snapshot' || event.data.requestId !== requestId) return
        clearTimeout(timeout)
        window.removeEventListener('message', onMessage)
        if (event.data.error) reject(new Error(event.data.error))
        else resolve(event.data.workflow)
      }
      window.addEventListener('message', onMessage)
      target.postMessage({ type: 'hyper-studio:request-workflow', requestId }, targetOrigin)
    })
  }, origin)
  const original = await snapshot()
  if (!Array.isArray(original?.nodes)) throw new Error('Canvas did not provide workflow JSON')
  const knownId = 37
  const unknownId = 90909
  const unknownType = 'HyperStudioThirdPartyNodeForCompatibilityTest'
  const fixture = structuredClone(original)
  fixture.nodes.push({
    id: knownId, type: 'EmptyImage', pos: [100, 100], size: [240, 90],
    flags: {}, order: 0, mode: 0, inputs: [],
    outputs: [{ name: 'IMAGE', type: 'IMAGE', links: null, slot_index: 0 }],
    properties: { 'Node name for S&R': 'EmptyImage' }, widgets_values: [64, 64, 1, 0],
  })
  fixture.nodes.push({
    id: unknownId, type: unknownType, pos: [400, 400], size: [240, 80],
    flags: {}, order: fixture.nodes.length, mode: 0, inputs: [], outputs: [],
    properties: {}, widgets_values: [],
  })
  fixture.last_node_id = Math.max(Number(fixture.last_node_id) || 0, unknownId)
  const source = path.join(home, 'third-party-workflow.json')
  fs.writeFileSync(source, JSON.stringify(fixture))
  await app.evaluate(({ dialog }, sourcePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sourcePath] })
  }, source)
  await window.getByRole('button', { name: 'Import', exact: true }).click()
  const imported = path.join(projectFolder, 'workflows', path.basename(source))
  for (let attempt = 0; attempt < 40 && !fs.existsSync(imported); attempt++) await new Promise(resolve => setTimeout(resolve, 250))
  if (!fs.existsSync(imported) || !fs.readFileSync(imported).equals(fs.readFileSync(source))) throw new Error('Imported workflow JSON was not preserved byte for byte')
  await window.waitForTimeout(1500)
  const loaded = await snapshot()
  if (!loaded.nodes.some(node => node.id === knownId)) throw new Error(`Imported workflow lost known node ID ${knownId}`)
  if (!loaded.nodes.some(node => node.id === unknownId && node.type === unknownType)) {
    throw new Error(`Imported workflow lost unknown node ${unknownId}/${unknownType}`)
  }
  const reviewText = await canvas.locator('body').innerText()
  const reviewEvidence = reviewText.split('\n').filter(line => /missing|HyperStudioThirdParty|install/i.test(line)).slice(0, 12)
  if (!reviewText.includes(`Missing node: ${unknownType}`) ||
      !reviewText.includes("This workflow uses a custom node that isn't installed. Install it from the registry or replace the node.")) {
    await window.screenshot({ path: path.join(home, 'missing-node-review.png') })
    throw new Error(`Missing-node review did not explain ${unknownType}; evidence: ${JSON.stringify(reviewEvidence)}`)
  }
  const guidanceVisible = await canvas.getByText(`Missing node: ${unknownType}`, { exact: true }).first().isVisible()
  await window.screenshot({ path: path.join(home, 'compatibility-passed.png') })
  process.stdout.write(`PASS: imported third-party workflow; preserved IDs ${knownId}, ${unknownId}; missing-node guidance surfaced ${unknownType}; guidance visible=${guidanceVisible}\n`)
} finally {
  await app.close()
}

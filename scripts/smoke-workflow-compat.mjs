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
  const installRequests = []
  window.on('request', request => {
    if (request.method() === 'POST' && /\/(?:manager|customnode)\/.*(?:install|queue)/.test(request.url())) {
      installRequests.push(request.url())
    }
  })
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
  // ImpactInt is a real third-party node type from the upstream browser fixture manifest.
  const unknownType = 'ImpactInt'
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
    properties: { cnr_id: 'comfyui-impact-pack' }, widgets_values: [42],
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
  if (!loaded.nodes.some(node => node.id === unknownId && node.type === unknownType && node.properties?.cnr_id === 'comfyui-impact-pack')) {
    throw new Error(`Imported workflow lost third-party node ${unknownId}/${unknownType} or its package ID`)
  }
  const reviewText = await canvas.locator('body').innerText()
  const reviewEvidence = reviewText.split('\n').filter(line => /missing|HyperStudioThirdParty|install/i.test(line)).slice(0, 12)
  if (!reviewText.includes(`Missing node: ${unknownType}`) ||
      !reviewText.includes("This workflow uses a custom node that isn't installed. Install it from the registry or replace the node.")) {
    await window.screenshot({ path: path.join(home, 'missing-node-review.png') })
    throw new Error(`Missing-node review did not explain ${unknownType}; evidence: ${JSON.stringify(reviewEvidence)}`)
  }
  const guidanceVisible = await canvas.getByText(`Missing node: ${unknownType}`, { exact: true }).first().isVisible()
  const systemStats = await (await fetch(new URL('system_stats', engine.url))).json()
  const managerEnabled = systemStats?.system?.argv?.includes('--enable-manager') === true
  const templateGallery = canvas.locator('[data-dialog-key="global-workflow-template-selector"]')
  if (await templateGallery.isVisible()) {
    await templateGallery.getByRole('button', { name: /close dialog/i }).click()
  }
  await canvas.getByRole('button', { name: 'Toggle properties panel' }).click({ timeout: 5000 })
  await canvas.getByTestId('panel-tab-errors').click({ timeout: 5000 })
  const missingCard = canvas.getByTestId('missing-node-card')
  await missingCard.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {})
  const installButton = missingCard.getByText('Install', { exact: true }).first()
  await installButton.waitFor({ state: 'attached', timeout: 20000 }).catch(() => {})
  const missingCardCount = await missingCard.count()
  const cardText = missingCardCount ? await missingCard.innerText() : ''
  const installButtons = await missingCard.getByText('Install', { exact: true }).count()
  const actions = missingCardCount ? await missingCard.locator('button').evaluateAll(buttons => buttons.map(button => ({ text: button.textContent?.trim(), label: button.getAttribute('aria-label') }))) : []
  process.stdout.write(`INSTALL_DIAGNOSTIC managerEnabled=${managerEnabled} missingCardCount=${missingCardCount} installButtons=${installButtons} actions=${JSON.stringify(actions)} card=${JSON.stringify(cardText.slice(0, 500))}\n`)
  await window.screenshot({ path: path.join(home, 'compatibility-passed.png') })
  process.stdout.write(`PASS: imported third-party workflow; preserved IDs ${knownId}, ${unknownId}; missing-node guidance surfaced ${unknownType}; guidance visible=${guidanceVisible}\n`)
  if (!managerEnabled || installButtons === 0) {
    throw new Error('PHASE 4 GATE: reviewed third-party node installation is unavailable in the packaged managed engine')
  }
  const extensions = path.join(shared, 'extensions', 'workflow')
  const extensionsBefore = fs.readdirSync(extensions).sort()
  await installButton.click({ timeout: 5000 })
  await canvas.getByText('Review third-party node installation', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
  const reviewContents = await canvas.locator('body').innerText()
  if (!reviewContents.includes('ComfyUI Impact Pack') || !reviewContents.includes('https://github.com/ltdrdata/ComfyUI-Impact-Pack')) {
    throw new Error('Install review did not show the node pack name and source repository')
  }
  if (JSON.stringify(fs.readdirSync(extensions).sort()) !== JSON.stringify(extensionsBefore)) {
    throw new Error('Node pack files changed before install review was confirmed')
  }
  if (installRequests.length) throw new Error(`Install request was sent before review confirmation: ${installRequests.join(', ')}`)
  process.stdout.write('PASS: install action opens explicit third-party source review before any package download\n')
} finally {
  await app.close()
}

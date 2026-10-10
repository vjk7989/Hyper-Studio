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
  try {
    await iframe.waitFor({ state: 'visible', timeout: 45000 })
  } catch (error) {
    await window.screenshot({ path: path.join(home, 'canvas-startup-failed.png') })
    const state = await window.locator('body').innerText().catch(() => '')
    throw new Error(`Canvas did not appear: ${String(error)}; visible UI: ${state.slice(0, 1200)}`)
  }
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
  const linked = structuredClone(fixture)
  const linkId = 811
  linked.nodes.find(node => node.id === knownId).outputs[0].links = [linkId]
  linked.nodes.push({
    id: 38, type: 'SaveImage', pos: [700, 100], size: [250, 90],
    flags: {}, order: linked.nodes.length, mode: 0,
    inputs: [{ name: 'images', type: 'IMAGE', link: linkId }], outputs: [],
    properties: { 'Node name for S&R': 'SaveImage' }, widgets_values: ['Hyper-Studio'],
  })
  linked.links = [...(Array.isArray(linked.links) ? linked.links : []), [linkId, knownId, 0, 38, 0, 'IMAGE']]
  linked.last_node_id = Math.max(Number(linked.last_node_id) || 0, 38)
  linked.last_link_id = Math.max(Number(linked.last_link_id) || 0, linkId)
  const grouped = structuredClone(linked)
  grouped.groups = [...(Array.isArray(grouped.groups) ? grouped.groups : []), {
    title: 'Imported scene', bounding: [60, 60, 950, 460], color: '#444444', font_size: 24,
  }]

  const importAndCheck = async (name, workflow, expectLink = false) => {
    const source = path.join(home, `${name}.json`)
    fs.writeFileSync(source, JSON.stringify(workflow))
    await app.evaluate(({ dialog }, sourcePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sourcePath] })
    }, source)
    await window.getByRole('button', { name: 'Import', exact: true }).click()
    const imported = path.join(projectFolder, 'workflows', path.basename(source))
    for (let attempt = 0; attempt < 40 && !fs.existsSync(imported); attempt++) await new Promise(resolve => setTimeout(resolve, 250))
    if (!fs.existsSync(imported) || !fs.readFileSync(imported).equals(fs.readFileSync(source))) {
      throw new Error(`${name}: imported workflow JSON was not preserved byte for byte`)
    }
    await window.waitForTimeout(1500)
    const loaded = await snapshot()
    if (!loaded.nodes.some(node => node.id === knownId)) throw new Error(`${name}: lost known node ID ${knownId}`)
    if (!loaded.nodes.some(node => node.id === unknownId && node.type === unknownType && node.properties?.cnr_id === 'comfyui-impact-pack')) {
      throw new Error(`${name}: lost third-party node ${unknownId}/${unknownType} or its package ID`)
    }
    if (expectLink && !loaded.links.some(link => link[0] === linkId && link[1] === knownId && link[3] === 38)) {
      throw new Error(`${name}: lost link ${linkId} between ${knownId} and 38`)
    }
    return loaded
  }
  await importAndCheck('missing-third-party-node', fixture)
  await importAndCheck('linked-editor-nodes', linked, true)
  await importAndCheck('grouped-third-party-node', grouped, true)
  process.stdout.write('PASS: three imported workflow variants preserved JSON, core/third-party node IDs, and links\n')
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
  const [managerVersion, installedPacks] = await Promise.all([
    fetch(new URL('v2/manager/version', engine.url)),
    fetch(new URL('v2/customnode/installed', engine.url)),
  ])
  if (!managerVersion.ok || !installedPacks.ok) {
    throw new Error(`Managed engine did not expose manager APIs: enabled=${managerEnabled}, version=${managerVersion.status}, installed=${installedPacks.status}`)
  }
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
  let reviewedTask = null
  await window.route('**/v2/manager/queue/task', async route => {
    reviewedTask = JSON.parse(route.request().postData() || '{}')
    // Stop before the manager receives an install task. This tests the reviewed
    // UI-to-manager contract without downloading or executing third-party code.
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'queued-for-smoke' })
  })
  const reviewDialog = canvas.getByRole('dialog').last()
  const reviewButtons = await reviewDialog.locator('button').evaluateAll(buttons => buttons.map(button => button.textContent?.trim()))
  process.stdout.write(`REVIEW_BUTTONS ${JSON.stringify(reviewButtons)}\n`)
  await reviewDialog.locator('button').last().click({ timeout: 5000 })
  for (let attempt = 0; attempt < 40 && !reviewedTask; attempt++) await new Promise(resolve => setTimeout(resolve, 250))
  if (reviewedTask?.kind !== 'install' || reviewedTask.params?.id !== 'comfyui-impact-pack' ||
      reviewedTask.params?.repository !== 'https://github.com/ltdrdata/ComfyUI-Impact-Pack') {
    throw new Error(`Reviewed action did not submit the expected manager install task: ${JSON.stringify(reviewedTask)}`)
  }
  if (JSON.stringify(fs.readdirSync(extensions).sort()) !== JSON.stringify(extensionsBefore)) {
    throw new Error('Node pack files changed during the intercepted install request')
  }
  process.stdout.write('PASS: managed engine APIs respond; confirmed review queues the correct install task (intercepted before download)\n')

  const nodeCatalog = await (await fetch(new URL('object_info', engine.url))).json()
  if (nodeCatalog.ComfyCloudFlux2TextToImageNode || !nodeCatalog.HyperStudioGenerateVideo) {
    throw new Error('Managed engine did not replace upstream cloud nodes with the shared-provider node')
  }
  const removedCloudId = 91001
  const removedCloudType = 'ComfyCloudFlux2TextToImageNode'
  const cloudFixture = structuredClone(original)
  cloudFixture.nodes.push({
    id: removedCloudId, type: removedCloudType, pos: [420, 420], size: [240, 80],
    flags: {}, order: cloudFixture.nodes.length, mode: 0, inputs: [], outputs: [],
    properties: { 'Node name for S&R': removedCloudType }, widgets_values: [],
  })
  cloudFixture.last_node_id = Math.max(Number(cloudFixture.last_node_id) || 0, removedCloudId)
  const cloudSource = path.join(home, 'removed-cloud-node.json')
  fs.writeFileSync(cloudSource, JSON.stringify(cloudFixture))
  await app.evaluate(({ dialog }, sourcePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sourcePath] })
  }, cloudSource)
  await window.getByRole('button', { name: 'Import', exact: true }).click()
  const cloudImported = path.join(projectFolder, 'workflows', 'removed-cloud-node.json')
  for (let attempt = 0; attempt < 40 && !fs.existsSync(cloudImported); attempt++) await new Promise(resolve => setTimeout(resolve, 250))
  if (!fs.existsSync(cloudImported) || !fs.readFileSync(cloudImported).equals(fs.readFileSync(cloudSource))) {
    throw new Error('Imported cloud-node workflow JSON was not preserved byte for byte')
  }
  const cloudLoaded = await snapshot()
  if (!cloudLoaded.nodes.some(node => node.id === removedCloudId && node.type === removedCloudType)) {
    throw new Error('Imported cloud-node identifier was rewritten or dropped')
  }
  if (!(await canvas.locator('body').innerText()).includes(`Missing node: ${removedCloudType}`)) {
    throw new Error('Removed cloud node did not show missing-node guidance')
  }
  process.stdout.write(`PASS: removed upstream cloud node ${removedCloudType} stays in imported JSON with ID ${removedCloudId} and shows missing-node guidance\n`)
} finally {
  await app.close()
}

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe')
if (!fs.existsSync(executablePath)) throw new Error('Build the Windows unpacked app first')
const home = path.join(root, '.local-tmp', 'packaged-electron-smoke')
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) {
  fs.mkdirSync(folder, { recursive: true })
}
const env = {
  ...process.env,
  HOME: home, USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'), LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  ELECTRON_ENABLE_LOGGING: '1',
  ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
  ...(process.env.CI ? { HYPER_STUDIO_WORKFLOW_TRACE: '1' } : {}),
}
const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], timeout: 120000 })
try {
  const window = await app.firstWindow({ timeout: 45000 })
  const pageErrors = []
  const badResponses = []
  window.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text().slice(0, 500)) })
  window.on('pageerror', error => pageErrors.push(String(error).slice(0, 500)))
  window.on('response', response => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`) })
  await window.waitForLoadState('domcontentloaded', { timeout: 45000 })
  const title = await window.title()
  if (!title.includes('Hyper-Studio')) throw new Error(`Unexpected window title: ${title}`)
  await window.screenshot({ path: path.join(home, 'first-run.png') })
  const shared = path.join(home, 'shared-storage')
  fs.mkdirSync(shared, { recursive: true })
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  try {
    await window.getByText('New Project', { exact: true }).waitFor({ state: 'visible', timeout: 30000 })
  } catch {
    await window.screenshot({ path: path.join(home, 'after-storage-error.png') })
    throw new Error(`Packaged app did not reach Projects; URL ${window.url()}; body ${(await window.locator('body').innerText()).slice(0, 2000)}; errors ${JSON.stringify(pageErrors)}`)
  }
  await window.screenshot({ path: path.join(home, 'projects.png') })
  const projectFolder = path.join(home, `workflow-project-${Date.now()}`)
  fs.mkdirSync(projectFolder, { recursive: true })
  await app.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] })
  }, projectFolder)
  await window.getByText('New Project', { exact: true }).click()
  await window.getByPlaceholder('Project name').fill('Package smoke')
  await window.getByText('Workflow mode', { exact: true }).click()
  await window.getByText('Choose a folder', { exact: true }).click()
  await window.getByText(projectFolder, { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
  await window.getByPlaceholder('Project name').press('Enter')
  try {
    await window.locator('iframe[title="Hyper-Studio workflow canvas"]').waitFor({ state: 'visible', timeout: 45000 })
    await window.frameLocator('iframe[title="Hyper-Studio workflow canvas"]').locator('#graph-canvas').waitFor({ state: 'visible', timeout: 45000 })
  } catch {
    await window.screenshot({ path: path.join(home, 'workflow-start-error.png') })
    const status = await window.evaluate(() => window.electronAPI.getWorkflowEngineStatus())
    const frames = await Promise.all(window.frames().map(async frame => ({ url: frame.url(), body: (await frame.locator('body').innerText().catch(() => '')).slice(0, 500) })))
    throw new Error(`Workflow canvas did not appear; engine status ${JSON.stringify(status)}; frames ${JSON.stringify(frames)}; responses ${JSON.stringify(badResponses)}; errors ${JSON.stringify(pageErrors)}: ${await window.locator('body').innerText()}`)
  }
  const engine = await window.evaluate(() => window.electronAPI.getWorkflowEngineStatus())
  const unrelatedSite = await fetch(engine.url, { headers: { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Dest': 'iframe' } })
  if (unrelatedSite.status !== 403) throw new Error(`Workflow engine accepted an unrelated cross-site iframe: ${unrelatedSite.status}`)
  await window.waitForTimeout(1500)
  const snapshot = await window.evaluate(async origin => {
    const target = document.querySelector('iframe[title="Hyper-Studio workflow canvas"]')?.contentWindow
    if (!target) throw new Error('Canvas iframe is missing')
    return await new Promise((resolve, reject) => {
      const requestId = 'packaged-smoke'
      const timeout = setTimeout(() => reject(new Error('Packaged canvas bridge did not answer')), 12000)
      const onMessage = event => {
        if (event.source !== target || event.origin !== origin || event.data?.type !== 'hyper-studio:workflow-snapshot' || event.data.requestId !== requestId) return
        clearTimeout(timeout)
        window.removeEventListener('message', onMessage)
        if (event.data.error) reject(new Error(event.data.error))
        else resolve(event.data.workflow)
      }
      window.addEventListener('message', onMessage)
      target.postMessage({ type: 'hyper-studio:request-workflow', requestId }, origin)
    })
  }, new URL(engine.url).origin)
  if (!Array.isArray(snapshot?.nodes)) throw new Error('Packaged canvas returned invalid workflow JSON')
  await window.getByRole('button', { name: 'Save', exact: true }).click()
  const saved = path.join(projectFolder, 'workflows', 'workflow.json')
  for (let attempt = 0; attempt < 40 && !fs.existsSync(saved); attempt++) await new Promise(resolve => setTimeout(resolve, 250))
  if (!fs.existsSync(saved)) throw new Error('Workflow toolbar did not save into the project folder')
  const importSource = path.join(home, 'roundtrip.json')
  fs.copyFileSync(saved, importSource)
  await app.evaluate(({ dialog }, sourcePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sourcePath] })
  }, importSource)
  await window.getByRole('button', { name: 'Import', exact: true }).click()
  const imported = path.join(projectFolder, 'workflows', 'roundtrip.json')
  for (let attempt = 0; attempt < 40 && !fs.existsSync(imported); attempt++) await new Promise(resolve => setTimeout(resolve, 250))
  if (!fs.existsSync(imported)) throw new Error('Workflow toolbar did not import JSON into the project')
  await window.getByRole('button', { name: 'Open', exact: true }).click()
  const exportPath = path.join(home, 'roundtrip-export.json')
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath })
  }, exportPath)
  await window.getByRole('button', { name: 'Export', exact: true }).click()
  for (let attempt = 0; attempt < 40 && !fs.existsSync(exportPath); attempt++) await new Promise(resolve => setTimeout(resolve, 250))
  if (!fs.existsSync(exportPath) || !fs.readFileSync(exportPath).equals(fs.readFileSync(imported))) {
    throw new Error('Workflow toolbar export changed the imported JSON bytes')
  }
  const prompt = {
    '1': { class_type: 'EmptyImage', inputs: { width: 64, height: 64, batch_size: 1, color: 0 } },
    '2': { class_type: 'SaveImage', inputs: { images: ['1', 0], filename_prefix: 'hyper-studio-package' } },
  }
  const submission = await fetch(new URL('prompt', engine.url), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, client_id: 'hyper-studio-package-smoke' }),
  })
  const submitted = await submission.json()
  if (!submission.ok || !submitted.prompt_id) throw new Error(`Packaged workflow prompt rejected: ${JSON.stringify(submitted)}`)
  let completed = false
  for (let attempt = 0; attempt < 120; attempt++) {
    const history = await (await fetch(new URL(`history/${submitted.prompt_id}`, engine.url))).json()
    if (history[submitted.prompt_id]) { completed = true; break }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!completed) throw new Error('Packaged workflow prompt did not finish')
  await window.getByRole('button', { name: 'Shared files (1)' }).waitFor({ state: 'visible', timeout: 20000 })
  await window.getByRole('button', { name: 'Shared files (1)' }).click()
  await window.getByText(/hyper-studio-package.*\.png/).waitFor({ state: 'visible', timeout: 10000 })
  await window.screenshot({ path: path.join(home, 'workflow-project.png') })
  await window.getByRole('button', { name: 'Editor', exact: true }).last().click()
  await window.getByRole('tablist', { name: 'Editor views' }).waitFor({ state: 'visible', timeout: 20000 })
  await window.getByRole('tab', { name: 'Video Editor' }).click()
  const media = await window.evaluate(projectId => window.electronAPI.listWorkspaceMedia({ projectId }), engine.projectId)
  const output = media.find(item => item.relativePath.endsWith('hyper-studio-package_00001_.png'))
  if (!output) throw new Error('Generated PNG was missing from the shared media index')
  const assetCard = window.locator(`[data-asset-id="workspace-${output.id}"]`)
  try {
    await assetCard.waitFor({ state: 'visible', timeout: 20000 })
    await window.waitForFunction(id => {
      const image = document.querySelector(`[data-asset-id="workspace-${id}"] img`)
      return image?.complete && image.naturalWidth > 0
    }, output.id, { timeout: 20000 })
  }
  catch {
    await window.screenshot({ path: path.join(home, 'editor-media-error.png') })
    throw new Error(`Workflow output was not rendered in Video Editor: ${output.relativePath}`)
  }
  await window.screenshot({ path: path.join(home, 'editor-project.png') })
  const editorSource = path.join(home, 'editor-import.png')
  fs.copyFileSync(output.absolutePath, editorSource)
  await window.evaluate(({ projectId, sourcePath }) => window.electronAPI.importWorkspaceMedia({ projectId, sourcePath, kind: 'image' }), { projectId: engine.projectId, sourcePath: editorSource })
  const workflowToggle = window.locator('button[title^="Workflow mode"]')
  try { await workflowToggle.evaluate(button => button.click(), { timeout: 5000 }) }
  catch {
    await window.screenshot({ path: path.join(home, 'workflow-return-error.png') })
    throw new Error(`Workflow toggle disappeared after Editor import: ${await window.locator('body').innerText()}`)
  }
  await window.waitForTimeout(500)
  if ((await workflowToggle.getAttribute('aria-pressed')) !== 'true') {
    await window.screenshot({ path: path.join(home, 'workflow-return-error.png') })
    throw new Error(`Workflow toggle did not stay selected after Editor import; title=${await workflowToggle.getAttribute('title')}`)
  }
  const sharedFiles = window.getByRole('button', { name: /Shared files \(\d+\)/ })
  try { await sharedFiles.waitFor({ state: 'visible', timeout: 20000 }) }
  catch {
    await window.screenshot({ path: path.join(home, 'workflow-return-error.png') })
    throw new Error(`Workflow mode did not return after Editor import: ${await window.locator('body').innerText()}`)
  }
  await sharedFiles.click()
  await window.getByText('editor-import.png', { exact: true }).waitFor({ state: 'visible', timeout: 20000 })
  const inputPrompt = {
    '1': { class_type: 'LoadImage', inputs: { image: 'editor-import.png' } },
    '2': { class_type: 'SaveImage', inputs: { images: ['1', 0], filename_prefix: 'hyper-studio-editor-input' } },
  }
  const inputSubmission = await fetch(new URL('prompt', engine.url), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: inputPrompt, client_id: 'hyper-studio-editor-input-smoke' }),
  })
  const inputSubmitted = await inputSubmission.json()
  if (!inputSubmission.ok || !inputSubmitted.prompt_id) throw new Error(`Editor image workflow prompt rejected: ${JSON.stringify(inputSubmitted)}`)
  let inputOutput = false
  for (let attempt = 0; attempt < 120; attempt++) {
    const history = await (await fetch(new URL(`history/${inputSubmitted.prompt_id}`, engine.url))).json()
    if (history[inputSubmitted.prompt_id]) { inputOutput = fs.existsSync(path.join(projectFolder, 'outputs', 'hyper-studio-editor-input_00001_.png')); break }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!inputOutput) throw new Error('Editor-imported image did not execute as a Workflow input')
  await window.screenshot({ path: path.join(home, 'workflow-after-editor-import.png') })
  process.stdout.write(`Packaged Electron Workflow canvas, JSON roundtrip, and bidirectional usable media passed: ${title}\n`)
} finally {
  await app.close()
}

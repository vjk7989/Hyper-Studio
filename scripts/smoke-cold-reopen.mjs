import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = path.resolve(process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe'))
const shared = path.resolve(process.env.HYPER_STUDIO_SMOKE_SHARED || path.join(root, '.local-tmp', 'packaged-electron-smoke', 'shared-storage'))
const home = path.resolve(process.env.HYPER_STUDIO_COLD_REOPEN_HOME || path.join(root, '.local-tmp', `cold-reopen-${Date.now()}`))
for (const folder of [home, shared]) assert.ok(folder.startsWith(`${root}${path.sep}`), `Smoke data must stay in repository: ${folder}`)
assert.ok(fs.existsSync(executablePath), `Installed app is missing: ${executablePath}`)
assert.ok(!fs.existsSync(home), `Use a fresh smoke home: ${home}`)
assert.ok(fs.existsSync(path.join(shared, 'runtimes', 'workflow', 'install.json')), 'Run the existing managed-runtime smoke first; cold reopen does not download a runtime')
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) fs.mkdirSync(folder, { recursive: true })
const projectFolder = path.join(home, 'project')
fs.mkdirSync(projectFolder)
const env = {
  ...process.env,
  HOME: home, USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'), LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
}
const launch = () => electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], timeout: 120000 })
const waitFor = async (predicate, description, timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for ${description}`)
}
const fixturePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8bYAAAAAASUVORK5CYII=', 'base64')
const source = path.join(home, 'editor-fixture.png')
fs.writeFileSync(source, fixturePng)
let projectId
let firstApp
try {
  firstApp = await launch()
  const page = await firstApp.firstWindow({ timeout: 45000 })
  await page.waitForLoadState('domcontentloaded', { timeout: 45000 })
  fs.mkdirSync(shared, { recursive: true })
  await page.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await page.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped({ skipped: true }))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { window.location.hash = '#/projects' })
  await page.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
  await firstApp.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, projectFolder)
  await page.getByTestId('new-project-card').click()
  await page.getByPlaceholder('Project name').fill('Cold reopen smoke')
  await page.getByText('Choose a folder', { exact: true }).click()
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  const manifestPath = path.join(projectFolder, '.hyper-studio', 'project.json')
  await waitFor(() => fs.existsSync(manifestPath), 'project manifest')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  projectId = manifest.projectId
  assert.equal(manifest.mode, 'editor')
  await page.locator('button[title^="Workflow mode"]').waitFor({ state: 'visible', timeout: 30000 })

  await page.evaluate(({ id, sourcePath }) => window.electronAPI.importWorkspaceMedia({ projectId: id, sourcePath, kind: 'image' }), { id: projectId, sourcePath: source })
  const output = path.join(projectFolder, 'outputs', 'workflow-fixture.png')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, fixturePng)
  await page.evaluate(id => window.electronAPI.registerWorkspaceMedia({ projectId: id, relativePath: 'outputs/workflow-fixture.png', kind: 'image', origin: 'workflow' }), projectId)
  await waitFor(async () => (await page.evaluate(id => window.electronAPI.listWorkspaceMedia({ projectId: id }), projectId)).length === 2, 'shared media index')
  await page.locator('button[title^="Workflow mode"]').click()
  await waitFor(() => JSON.parse(fs.readFileSync(manifestPath, 'utf8')).mode === 'workflow', 'persisted Workflow mode')
  await page.getByRole('button', { name: 'Shared files (2)' }).waitFor({ state: 'visible', timeout: 120000 })
  await page.getByRole('button', { name: 'Shared files (2)' }).click()
  await page.getByText('editor-fixture.png', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
  await page.getByText('workflow-fixture.png', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
  process.stdout.write('PASS: first process created one project and both media origins are visible in Workflow\n')
} finally {
  if (firstApp) await firstApp.close()
}

let reopenedApp
try {
  reopenedApp = await launch()
  const page = await reopenedApp.firstWindow({ timeout: 45000 })
  await page.waitForLoadState('domcontentloaded', { timeout: 45000 })
  await page.evaluate(() => { window.location.hash = '#/projects' })
  const card = page.getByTestId(`project-card-${projectId}`)
  await card.waitFor({ state: 'visible', timeout: 30000 })
  await card.getByText('Cold reopen smoke', { exact: true }).waitFor({ state: 'visible' })
  await card.getByRole('button', { name: 'Open Cold reopen smoke' }).click()
  await page.locator('button[title^="Workflow mode"][aria-pressed="true"]').waitFor({ state: 'visible', timeout: 30000 })
  const reopenedManifest = await page.evaluate(folder => window.electronAPI.openWorkspaceProject({ folder }), projectFolder)
  assert.equal(reopenedManifest.projectId, projectId)
  assert.equal(reopenedManifest.mode, 'workflow')
  const media = await page.evaluate(id => window.electronAPI.listWorkspaceMedia({ projectId: id }), projectId)
  assert.deepEqual(new Set(media.map(item => item.relativePath)), new Set(['assets/editor-fixture.png', 'outputs/workflow-fixture.png']))
  await page.getByRole('button', { name: 'Shared files (2)' }).waitFor({ state: 'visible', timeout: 120000 })
  const sharedFiles = page.getByRole('button', { name: 'Shared files (2)' })
  if (await sharedFiles.getAttribute('aria-expanded') !== 'true') await sharedFiles.click()
  await page.getByText('editor-fixture.png', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
  await page.getByText('workflow-fixture.png', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
  await page.locator('button[title^="Editor mode"]').click()
  await page.getByRole('tab', { name: 'Video Editor' }).click()
  for (const item of media) await page.locator(`[data-asset-id="workspace-${item.id}"]`).waitFor({ state: 'visible', timeout: 20000 })
  process.stdout.write('PASS: full process reopen retained project identity, selected mode, durable media, Workflow list, and Editor asset cards\n')
} finally {
  if (reopenedApp) await reopenedApp.close()
}

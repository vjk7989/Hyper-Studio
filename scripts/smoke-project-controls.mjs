import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe')
const home = path.resolve(process.env.HYPER_STUDIO_PROJECT_SMOKE_HOME || path.join(root, '.local-tmp', `project-controls-smoke-${Date.now()}`))
if (process.platform !== 'win32') throw new Error('The real OS Trash smoke runs on Windows first')
if (!home.startsWith(`${root}${path.sep}`)) throw new Error('Smoke home must stay inside the repository')
if (fs.existsSync(home)) throw new Error(`Use a fresh smoke home: ${home}`)
if (!fs.existsSync(executablePath)) throw new Error(`Packaged app is missing: ${executablePath}`)
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) fs.mkdirSync(folder, { recursive: true })

const env = {
  ...process.env,
  HOME: home, USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'), LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
}
const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu'], timeout: 120000 })
let window
try {
  window = await app.firstWindow({ timeout: 45000 })
  await window.waitForLoadState('domcontentloaded', { timeout: 45000 })
  const shared = path.join(home, 'shared-storage')
  fs.mkdirSync(shared, { recursive: true })
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await window.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped({ skipped: true }))
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.getByTestId('sidebar-new-project').waitFor({ state: 'visible', timeout: 30000 })
  await window.getByText('No recent projects', { exact: true }).waitFor({ state: 'visible' })

  const projectFolder = path.join(home, 'project-to-trash')
  fs.mkdirSync(projectFolder, { recursive: true })
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, projectFolder)
  await window.getByTestId('sidebar-new-project').click()
  await window.getByPlaceholder('Project name').fill('Project controls smoke')
  await window.getByText('Choose a folder', { exact: true }).click()
  await window.screenshot({ path: path.join(home, 'create-with-long-folder.png') })
  await window.getByRole('button', { name: 'Create', exact: true }).click()
  const manifestPath = path.join(projectFolder, '.hyper-studio', 'project.json')
  await window.waitForFunction(() => document.querySelector('[data-testid^="recent-project-menu-"]') !== null, null, { timeout: 45000 })
  if (!fs.existsSync(manifestPath)) throw new Error('New Project did not create a project manifest')
  const { projectId } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (!projectId) throw new Error('Project manifest is missing its ID')
  process.stdout.write('PASS: empty Recent projects offers New Project, and sidebar creation opens the existing folder/mode flow\n')

  await window.evaluate(() => { window.location.hash = '#/projects' })
  const card = window.getByTestId(`project-card-${projectId}`)
  await card.waitFor({ state: 'visible' })
  await card.hover()
  await window.getByTestId(`project-card-menu-${projectId}`).click()
  await window.getByRole('menuitem', { name: 'Rename', exact: true }).click()
  await window.getByPlaceholder('Project name').fill('Renamed project smoke')
  await window.getByRole('button', { name: 'Save', exact: true }).click()
  await card.getByText('Renamed project smoke').waitFor({ state: 'visible' })
  let renamedManifest = false
  for (let attempt = 0; attempt < 50; attempt++) {
    renamedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).name === 'Renamed project smoke'
    if (renamedManifest) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  if (!renamedManifest) throw new Error('Project rename did not reach its manifest')
  await window.reload({ waitUntil: 'domcontentloaded' })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await card.getByText('Renamed project smoke').waitFor({ state: 'visible' })
  process.stdout.write('PASS: Projects card rename persists across reload\n')

  const recentMenuTrigger = window.getByTestId(`recent-project-menu-${projectId}`)
  await recentMenuTrigger.click()
  await window.getByRole('menuitem', { name: 'Remove…' }).waitFor({ state: 'visible' })
  await window.keyboard.press('Escape')
  await window.getByRole('menuitem', { name: 'Remove…' }).waitFor({ state: 'hidden' })
  await window.waitForFunction(id => document.activeElement?.getAttribute('data-testid') === `recent-project-menu-${id}`, projectId)
  await recentMenuTrigger.click()
  await window.getByText(/^Shared storage:/).click()
  await window.getByRole('menuitem', { name: 'Remove…' }).waitFor({ state: 'hidden' })
  process.stdout.write('PASS: Recent project menu dismisses on Escape and outside click, returning focus\n')
  await recentMenuTrigger.click()
  await window.getByRole('menuitem', { name: 'Remove…' }).click()
  const removal = window.getByTestId('project-remove-dialog')
  await removal.waitFor({ state: 'visible' })
  await removal.getByText(projectFolder, { exact: true }).waitFor({ state: 'visible' })
  await window.screenshot({ path: path.join(home, 'remove-dialog.png') })
  await window.getByTestId('remove-from-app').click()
  await window.getByTestId('confirm-project-removal').click()
  await card.waitFor({ state: 'detached' })
  if (!fs.existsSync(manifestPath)) throw new Error('App-only removal unexpectedly removed project files')
  await window.getByTestId(`recent-project-menu-${projectId}`).waitFor({ state: 'detached' })
  process.stdout.write('PASS: sidebar app-only removal forgets the project but preserves its folder\n')

  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, projectFolder)
  await window.getByRole('button', { name: 'Open project folder' }).click()
  await window.getByTestId(`recent-project-menu-${projectId}`).waitFor({ state: 'visible', timeout: 30000 })
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await card.waitFor({ state: 'visible', timeout: 30000 })
  process.stdout.write('PASS: Open project folder restores a forgotten project with the same ID\n')

  await app.evaluate(({ shell }) => {
    globalThis.__hyperStudioOriginalTrashItem = shell.trashItem
    shell.trashItem = async () => { throw new Error('smoke-trash-denied') }
  })
  await card.hover()
  await window.getByTestId(`project-card-menu-${projectId}`).click()
  await window.getByRole('menuitem', { name: 'Remove…', exact: true }).click()
  await window.getByTestId('move-project-to-trash').click()
  await window.getByTestId('confirm-project-removal').click()
  await removal.getByRole('alert').getByText(/smoke-trash-denied/).waitFor({ state: 'visible' })
  if (!fs.existsSync(manifestPath) || !(await card.isVisible())) throw new Error('Failed Trash changed the project state')
  process.stdout.write('PASS: failed Trash leaves the project registered and files intact\n')

  await app.evaluate(({ shell }) => { shell.trashItem = globalThis.__hyperStudioOriginalTrashItem })
  await window.getByTestId('confirm-project-removal').click()
  await card.waitFor({ state: 'detached', timeout: 30000 })
  if (fs.existsSync(projectFolder)) throw new Error('Successful Trash left the project folder in place')
  process.stdout.write('PASS: confirmed OS Trash moves the entire disposable folder and removes the app entry\n')

  await window.screenshot({ path: path.join(home, 'projects-after-removal.png') })
} catch (error) {
  if (window) await window.screenshot({ path: path.join(home, 'project-controls-failure.png') }).catch(() => {})
  throw error
} finally {
  await app.close()
}

const reopenedApp = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu'], timeout: 120000 })
try {
  const reopened = await reopenedApp.firstWindow({ timeout: 45000 })
  await reopened.waitForLoadState('domcontentloaded', { timeout: 45000 })
  await reopened.evaluate(() => { window.location.hash = '#/projects' })
  await reopened.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
  if (await reopened.locator('[data-testid^="project-card-"]').count()) throw new Error('Removed project reappeared after app restart')
  process.stdout.write('PASS: project removal stays removed after app restart\n')
} finally {
  await reopenedApp.close()
}

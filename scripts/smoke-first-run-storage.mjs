import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe')
const home = path.resolve(process.env.HYPER_STUDIO_STORAGE_SMOKE_HOME || path.join(root, '.local-tmp', `first-run-storage-${Date.now()}`))
if (!home.startsWith(`${root}${path.sep}`) || fs.existsSync(home)) throw new Error('Use a fresh smoke home inside the repository')
if (!fs.existsSync(executablePath)) throw new Error(`Packaged app is missing: ${executablePath}`)
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) fs.mkdirSync(folder, { recursive: true })
const shared = path.join(home, 'shared-storage')
fs.mkdirSync(shared)
const env = {
  ...process.env,
  HOME: home, USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'), LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
}

const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu'], timeout: 120000 })
try {
  const page = await app.firstWindow({ timeout: 45000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('heading', { name: 'Choose shared storage' }).waitFor({ state: 'visible', timeout: 45000 })
  const chooser = page.getByRole('button', { name: 'Choose a folder' })
  const continueButton = page.getByRole('button', { name: 'Continue' })
  assert.equal(await continueButton.isDisabled(), true)

  await app.evaluate(({ dialog }) => { dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] }) })
  await chooser.click()
  await chooser.waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.activeElement?.textContent?.includes('Choose a folder'))
  assert.equal(await continueButton.isDisabled(), true)
  assert.equal(await page.getByRole('alert').count(), 0)
  process.stdout.write('PASS: cancelling the first storage picker leaves setup available and restores focus\n')

  await app.evaluate(({ dialog }) => {
    globalThis.__storagePickerCalls = 0
    dialog.showOpenDialog = () => new Promise(resolve => {
      globalThis.__storagePickerCalls++
      globalThis.__resolveStoragePicker = resolve
    })
  })
  await chooser.click()
  const busyChooser = page.getByRole('button', { name: 'Opening folder picker…' })
  await busyChooser.waitFor({ state: 'visible' })
  assert.equal(await busyChooser.isDisabled(), true)
  assert.equal(await continueButton.isDisabled(), true)
  assert.equal(await app.evaluate(() => globalThis.__storagePickerCalls), 1)
  await app.evaluate(() => {
    globalThis.__resolveStoragePicker({ canceled: true, filePaths: [] })
    delete globalThis.__resolveStoragePicker
  })
  await chooser.waitFor({ state: 'visible' })
  process.stdout.write('PASS: pending picker disables duplicate selection and Continue\n')

  await app.evaluate(({ dialog }) => { dialog.showOpenDialog = async () => { throw new Error('Picker fixture failed') } })
  await chooser.click()
  await page.getByRole('alert').getByText('Picker fixture failed').waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.activeElement?.textContent?.includes('Choose a folder'))
  assert.equal(await continueButton.isDisabled(), true)
  process.stdout.write('PASS: picker errors are visible, recoverable, and keep focus in setup\n')

  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, shared)
  await chooser.click()
  const selected = page.getByRole('button', { name: shared })
  await selected.waitFor({ state: 'visible' })
  assert.equal(await continueButton.isEnabled(), true)
  assert.equal(await page.getByRole('alert').count(), 0)

  await app.evaluate(({ dialog }) => { dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] }) })
  await selected.click()
  await selected.waitFor({ state: 'visible' })
  assert.equal(await continueButton.isEnabled(), true)
  await continueButton.click()
  await page.waitForFunction(folder => window.electronAPI.getSharedStorageRoot().then(saved => saved === folder), shared)
  assert.equal(await page.evaluate(() => window.electronAPI.getSharedStorageRoot()), shared)
  process.stdout.write('PASS: selected storage survives a later cancel and persists after Continue\n')

  const connectionChoice = page.getByRole('dialog', { name: 'Make something with Hyper-Studio' })
  await connectionChoice.waitFor({ state: 'visible', timeout: 45000 })
  await page.waitForFunction(() => document.activeElement?.textContent?.includes('Connect a video API'))
  await connectionChoice.getByRole('button', { name: /Connect a video API/ }).click()
  await page.getByRole('dialog', { name: 'Add a video connection' }).waitFor({ state: 'visible' })
  await page.keyboard.press('Escape')
  await connectionChoice.waitFor({ state: 'visible' })
  await connectionChoice.getByRole('button', { name: /Explore without a connection/ }).click()
  await connectionChoice.waitFor({ state: 'hidden' })
  assert.equal(await page.evaluate(() => window.electronAPI.getConnectionOnboardingSkipped()), true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByTestId('sidebar-new-project').waitFor({ state: 'visible', timeout: 45000 })
  assert.equal(await page.getByRole('dialog', { name: /Make something with Hyper-Studio|Add a video connection/ }).count(), 0)
  process.stdout.write('PASS: zero-profile connection choice supports Back, Explore, and persisted skip after restart\n')
} finally {
  await app.close()
}

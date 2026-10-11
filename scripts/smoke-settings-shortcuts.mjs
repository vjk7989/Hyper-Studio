import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe')
const home = path.resolve(process.env.HYPER_STUDIO_SETTINGS_SMOKE_HOME || path.join(root, '.local-tmp', `settings-shortcuts-${Date.now()}`))
if (!home.startsWith(`${root}${path.sep}`) || fs.existsSync(home)) throw new Error('Use a fresh smoke home inside the repository')
if (!fs.existsSync(executablePath)) throw new Error(`Packaged app is missing: ${executablePath}`)
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp'), path.join(home, 'shared')]) fs.mkdirSync(folder, { recursive: true })
const env = {
  ...process.env,
  HOME: home, USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'), LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
}

const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu'], timeout: 120000 })
let page
try {
  page = await app.firstWindow({ timeout: 45000 })
  await page.waitForLoadState('domcontentloaded', { timeout: 45000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), path.join(home, 'shared'))
  await page.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped({ skipped: true }))
  await page.reload({ waitUntil: 'domcontentloaded' })
  const trigger = page.getByRole('button', { name: 'Settings', exact: true }).last()
  await trigger.waitFor({ state: 'visible', timeout: 45000 })
  const settings = page.getByRole('dialog', { name: 'Settings' })
  const open = async () => { await trigger.focus(); await trigger.press('Enter'); await settings.waitFor({ state: 'visible' }) }
  const triggerFocused = async () => page.waitForFunction(node => document.activeElement === node, await trigger.elementHandle())

  await open()
  assert.equal(await settings.evaluate(node => node.contains(document.activeElement)), true)
  await page.keyboard.press('Shift+Tab')
  assert.equal(await settings.evaluate(node => node.contains(document.activeElement)), true)
  await page.keyboard.press('Tab')
  assert.equal(await settings.evaluate(node => node.contains(document.activeElement)), true)
  await page.keyboard.press('/')
  assert.equal(await page.getByRole('dialog', { name: 'Search' }).count(), 0)
  process.stdout.write('PASS: Settings owns initial and Tab focus; slash does not open Search over it\n')

  await page.evaluate(() => {
    const nested = document.createElement('div')
    nested.setAttribute('role', 'dialog')
    nested.setAttribute('aria-modal', 'true')
    nested.setAttribute('aria-label', 'Nested fixture')
    nested.style.cssText = 'position:fixed;inset:20%;z-index:9999;background:white'
    const button = document.createElement('button')
    button.textContent = 'Nested action'
    nested.append(button)
    document.body.append(nested)
    button.focus()
  })
  await page.keyboard.press('Escape')
  assert.equal(await settings.isVisible(), true)
  await page.evaluate(() => document.querySelector('[aria-label="Nested fixture"]')?.remove())
  await page.keyboard.press('Escape')
  await settings.waitFor({ state: 'hidden' })
  await triggerFocused()
  process.stdout.write('PASS: nested dialog Escape leaves Settings open; Settings Escape restores trigger focus\n')

  await open()
  await settings.getByRole('button', { name: 'Close settings' }).click()
  await settings.waitFor({ state: 'hidden' })
  await triggerFocused()
  await open()
  await page.mouse.click(5, 5)
  await settings.waitFor({ state: 'hidden' })
  await triggerFocused()
  process.stdout.write('PASS: Close and backdrop dismissal both restore connected trigger focus\n')

  await page.keyboard.press('/')
  const search = page.getByRole('dialog', { name: 'Search' })
  await search.waitFor({ state: 'visible' })
  const searchInput = search.getByRole('combobox')
  await searchInput.fill('/')
  assert.equal(await searchInput.inputValue(), '/')
  assert.equal(await page.getByRole('dialog', { name: 'Settings' }).count(), 0)
  process.stdout.write('PASS: slash opens Explore search only outside dialogs and remains text inside its input\n')

  await searchInput.press('Escape')
  // Dialog libraries may close on the first Escape even when the input clears
  // its query. If it remains open, a second Escape closes the empty search.
  if (await search.isVisible()) await page.keyboard.press('Escape')
  await search.waitFor({ state: 'hidden' })
  await page.evaluate(() => {
    window.__settingsScrollBehaviors = []
    const original = HTMLElement.prototype.scrollTo
    HTMLElement.prototype.scrollTo = function (options) {
      if (options && typeof options === 'object') window.__settingsScrollBehaviors.push(options.behavior)
      return original.call(this, options)
    }
    window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'general', scrollAnchor: 'textEncoding' } }))
  })
  await settings.waitFor({ state: 'visible' })
  await page.waitForFunction(() => window.__settingsScrollBehaviors.includes('auto'))
  process.stdout.write('PASS: reduced-motion Settings anchor scroll uses auto behavior\n')
} catch (error) {
  if (page) await page.screenshot({ path: path.join(home, 'failure.png') }).catch(() => undefined)
  throw error
} finally {
  await app.close()
}

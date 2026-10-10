import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exe = process.env.HYPER_STUDIO_EDITOR_SMOKE_EXE
if (process.platform !== 'win32') throw new Error('The installed Editor smoke runs on Windows')
if (!exe || !fs.existsSync(exe)) throw new Error('Set HYPER_STUDIO_EDITOR_SMOKE_EXE to the rebuilt installed Hyper-Studio.exe')

const home = path.join(root, '.local-tmp', `editor-controls-${Date.now()}`)
const project = path.join(home, 'project')
const fixture = path.join(home, 'fixture')
for (const subdir of ['', 'appdata', 'localappdata', 'temp', 'shared', 'project', 'fixture', 'Downloads']) {
  fs.mkdirSync(path.join(home, subdir), { recursive: true })
}
const redPng = path.join(fixture, 'red.png')
const toneWav = path.join(fixture, 'tone.wav')
const captions = path.join(fixture, 'caption.srt')
fs.writeFileSync(redPng, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64'))
const wav = Buffer.alloc(44 + 44100 * 2)
wav.write('RIFF', 0)
wav.writeUInt32LE(wav.length - 8, 4)
wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(44100, 24)
wav.writeUInt32LE(88200, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(wav.length - 44, 40)
for (let sample = 0; sample < 44100; sample++) {
  wav.writeInt16LE(Math.round(Math.sin(sample * 2 * Math.PI * 440 / 44100) * 12000), 44 + sample * 2)
}
fs.writeFileSync(toneWav, wav)
fs.writeFileSync(captions, '1\n00:00:00,000 --> 00:00:01,000\nSmoke caption\n')

const env = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'),
  LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'),
  TMP: path.join(home, 'temp'),
  TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
}
const results = []
let app
let page
const record = (name, detail) => {
  results.push({ name, status: 'PASS', detail })
  fs.writeFileSync(path.join(home, 'results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`PASS: ${name}${detail ? ` — ${detail}` : ''}\n`)
}
const waitUntil = async (predicate, label, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error(`Timed out waiting for ${label}`)
}
const readEditor = () => JSON.parse(fs.readFileSync(path.join(project, '.hyper-studio', 'editor.json'), 'utf8'))
const activeTimeline = () => {
  const model = readEditor()
  return model.timelines.find(timeline => timeline.id === model.activeTimelineId)
}
const menu = async (section, item) => {
  await page.getByRole('button', { name: section, exact: true }).last().click()
  await page.getByText(item, { exact: true }).last().click()
}
const launch = async () => {
  app = await electron.launch({ executablePath: exe, cwd: root, env, args: ['--no-sandbox', '--disable-gpu'], timeout: 120000 })
  page = await app.firstWindow({ timeout: 45000 })
  await page.waitForLoadState('domcontentloaded', { timeout: 45000 })
}

try {
  await launch()
  await page.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), path.join(home, 'shared'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { location.hash = '#/projects' })
  await page.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, project)
  await page.getByTestId('new-project-card').click()
  await page.getByPlaceholder('Project name').fill('Editor control smoke')
  await page.getByText('Editor mode', { exact: true }).click()
  await page.getByText('Choose a folder', { exact: true }).click()
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.getByRole('tablist', { name: 'Editor views' }).waitFor({ state: 'visible', timeout: 45000 })
  await page.getByRole('tab', { name: 'Video Editor' }).click()
  await page.getByText('Timeline 1', { exact: true }).first().waitFor({ state: 'visible' })
  record('Create Editor project and open Video Editor')

  await menu('File', 'New Timeline')
  await page.getByText('Timeline 2', { exact: true }).first().waitFor({ state: 'visible' })
  await waitUntil(() => activeTimeline()?.name === 'Timeline 2', 'persisted Timeline 2')
  record('New Timeline uses a unique default name', 'Timeline 2')

  await menu('File', 'Duplicate Active Timeline')
  await page.getByText('Timeline 2 Copy', { exact: true }).first().waitFor({ state: 'visible' })
  await waitUntil(() => activeTimeline()?.name === 'Timeline 2 Copy', 'persisted duplicate timeline')
  record('Duplicate Active Timeline', 'Timeline 2 Copy')

  await menu('Sequence', 'Add Video Track')
  await page.getByText('V4', { exact: true }).first().waitFor({ state: 'visible' })
  await menu('Sequence', 'Add Audio Track')
  await page.getByText('A3', { exact: true }).first().waitFor({ state: 'visible' })
  await menu('Sequence', 'Add Subtitle Track')
  await page.getByRole('button', { name: 'Import SRT' }).waitFor({ state: 'visible' })
  record('Add video, audio, and subtitle tracks', 'V4, A3, Subtitles')

  await page.locator('input[type=file][accept=".srt"]').setInputFiles(captions)
  await page.getByText('Smoke caption', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 })
  record('Import SRT', 'one visible cue')

  await page.locator('input[type=file][accept="video/*,audio/*,image/*"]').first().setInputFiles([redPng, toneWav])
  const mediaPath = path.join(project, '.hyper-studio', 'media.json')
  await waitUntil(() => {
    if (!fs.existsSync(mediaPath)) return false
    const entries = JSON.parse(fs.readFileSync(mediaPath, 'utf8')).entries
    return entries.some(entry => entry.relativePath === 'assets/red.png') && entries.some(entry => entry.relativePath === 'assets/tone.wav')
  }, 'imported PNG and WAV media entries', 45000)
  assert.ok(fs.existsSync(path.join(project, 'assets', 'red.png')))
  assert.ok(fs.existsSync(path.join(project, 'assets', 'tone.wav')))
  record('Import PNG and WAV', 'copied into project assets and media manifest')

  await app.close()
  app = null
  page = null
  await launch()
  await page.evaluate(() => { location.hash = '#/projects' })
  await page.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
  await page.getByRole('button', { name: 'Open Editor control smoke' }).click()
  await page.getByRole('tablist', { name: 'Editor views' }).waitFor({ state: 'visible', timeout: 45000 })
  await page.getByRole('tab', { name: 'Video Editor' }).click()
  await page.getByText('Timeline 2 Copy', { exact: true }).first().waitFor({ state: 'visible' })
  await waitUntil(() => readEditor().assets.filter(asset => /assets\/(red\.png|tone\.wav)$/.test(asset.path)).length === 2, 'reopened imported assets')
  assert.equal(activeTimeline()?.name, 'Timeline 2 Copy')
  record('Reopen preserves imported assets and timeline')

  const activeCard = page.locator('div.group').filter({ hasText: 'Timeline 2 Copy' }).filter({ hasText: 'ACTIVE' }).first()
  await page.getByRole('button', { name: 'Add Text Overlay' }).click()
  await activeCard.getByText('1 clip', { exact: true }).waitFor({ state: 'visible' })
  await page.getByText('Title Text', { exact: true }).first().waitFor({ state: 'visible' })
  await menu('Edit', 'Undo')
  await activeCard.getByText('0 clips', { exact: true }).waitFor({ state: 'visible' })
  await menu('Edit', 'Redo')
  await activeCard.getByText('1 clip', { exact: true }).waitFor({ state: 'visible' })
  await waitUntil(() => activeTimeline()?.clips.length === 1, 'restored text overlay in saved timeline')
  record('Text overlay Undo and Redo', 'clip count 1 → 0 → 1')

  const zoom = page.locator('input[type=range][title^="Zoom:"]')
  const zoomBefore = Number(await zoom.inputValue())
  await menu('View', 'Zoom In')
  const zoomIn = Number(await zoom.inputValue())
  assert.ok(zoomIn > zoomBefore, `${zoomBefore} → ${zoomIn}`)
  await menu('View', 'Zoom Out')
  const zoomOut = Number(await zoom.inputValue())
  assert.ok(zoomOut < zoomIn && zoomOut <= zoomBefore + 5, `${zoomBefore} → ${zoomIn} → ${zoomOut}`)
  record('Zoom In and Zoom Out', `${zoomBefore} → ${zoomIn} → ${zoomOut}`)

  await menu('Sequence', 'Disable Snapping')
  await page.getByRole('button', { name: 'Sequence', exact: true }).click()
  await page.getByText('Enable Snapping', { exact: true }).last().waitFor({ state: 'visible' })
  await page.keyboard.press('Escape')
  await menu('Sequence', 'Enable Snapping')
  record('Snapping menu toggle', 'disable → enable')

  await menu('View', 'Show Properties Panel')
  await menu('View', 'Hide Properties Panel')
  record('Properties panel toggle', 'show → hide')
  await menu('View', 'Show Clip Viewer')
  await menu('View', 'Hide Clip Viewer')
  record('Clip Viewer toggle', 'show → hide')

  await page.locator('body').click({ position: { x: 900, y: 400 } })
  const timecode = async () => (await page.locator('body').innerText()).match(/00:00:\d\d:\d\d/)?.[0]
  const before = await timecode()
  assert.ok(before)
  await page.keyboard.press('Space')
  await page.waitForTimeout(600)
  await page.keyboard.press('Space')
  const after = await timecode()
  assert.ok(after && after !== before, `playback timecode stayed at ${before}`)
  record('Playback transport advances and pauses', `${before} → ${after}`)

  await page.getByRole('button', { name: 'Export', exact: true }).last().click()
  await page.getByText('Package (FCPXML)', { exact: true }).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Export Video' }).waitFor({ state: 'visible' })
  record('Export settings dialog opens', 'render not started')
  await page.screenshot({ path: path.join(home, 'editor-export-dialog.png') })

  await page.locator('div.fixed.inset-0.z-50').first().click({ position: { x: 5, y: 5 } })
  await menu('File', 'New Timeline')
  await page.getByText('Timeline 3', { exact: true }).first().waitFor({ state: 'visible' })
  const imageAsset = readEditor().assets.find(asset => /assets\/red\.png$/.test(asset.path))
  assert.ok(imageAsset, 'reopened project lost the imported PNG asset')
  await page.locator(`[data-asset-card][data-asset-id="${imageAsset.id}"]`).click({ button: 'right' })
  await page.getByText('Add to Timeline', { exact: true }).click()
  await waitUntil(() => activeTimeline()?.clips.some(clip => clip.assetId === imageAsset.id), 'imported PNG clip in export timeline')
  record('Add imported image to export timeline', 'Timeline 3 has PNG clip')

  const packagePath = path.join(home, 'timeline-package.fcpxml')
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath })
  }, packagePath)
  await page.getByRole('button', { name: 'Export', exact: true }).last().click()
  await page.getByRole('button', { name: /Package \(FCPXML\)/ }).click()
  await page.getByText('Export complete', { exact: true }).waitFor({ state: 'visible', timeout: 20000 })
  await waitUntil(() => fs.existsSync(packagePath), 'FCPXML package file')
  const xml = fs.readFileSync(packagePath, 'utf8')
  const parsed = await page.evaluate(source => {
    const document = new DOMParser().parseFromString(source, 'application/xml')
    return {
      parserError: document.querySelector('parsererror')?.textContent ?? null,
      root: document.documentElement.nodeName,
      assetCount: document.querySelectorAll('asset').length,
      clipCount: document.querySelectorAll('asset-clip').length,
      hasPng: Array.from(document.querySelectorAll('asset')).some(asset => asset.getAttribute('src')?.includes('red.png')),
    }
  }, xml)
  assert.equal(parsed.parserError, null)
  assert.equal(parsed.root, 'fcpxml')
  assert.ok(parsed.assetCount >= 1 && parsed.clipCount >= 1 && parsed.hasPng, JSON.stringify(parsed))
  record('Export local FCPXML package', `${path.basename(packagePath)}; ${parsed.assetCount} asset, ${parsed.clipCount} clip`)
  await page.screenshot({ path: path.join(home, 'editor-package-complete.png') })
} catch (error) {
  results.push({ name: 'smoke', status: 'FAIL', detail: String(error) })
  fs.writeFileSync(path.join(home, 'results.json'), JSON.stringify(results, null, 2))
  if (page) await page.screenshot({ path: path.join(home, 'failure.png') }).catch(() => {})
  throw error
} finally {
  if (app) await app.close()
  process.stdout.write(`Evidence: ${home}\n`)
}

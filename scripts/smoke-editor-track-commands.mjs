import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exe = process.env.HYPER_STUDIO_EDITOR_SMOKE_EXE
if (process.platform !== 'win32') throw new Error('The installed Editor smoke runs on Windows')
if (!exe || !fs.existsSync(exe)) throw new Error('Set HYPER_STUDIO_EDITOR_SMOKE_EXE to an installed Hyper-Studio.exe')

const home = path.join(root, '.local-tmp', `editor-track-commands-${Date.now()}`)
const project = path.join(home, 'project')
const fixture = path.join(home, 'fixture')
for (const subdir of ['', 'appdata', 'localappdata', 'temp', 'shared', 'project', 'fixture', 'Downloads']) {
  fs.mkdirSync(path.join(home, subdir), { recursive: true })
}
const imagePath = path.join(fixture, 'red.png')
const audioPath = path.join(fixture, 'tone.wav')
fs.copyFileSync(path.join(root, 'apps', 'desktop', 'public', 'favicon.png'), imagePath)
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
fs.writeFileSync(audioPath, wav)

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
const timeline = () => {
  const model = JSON.parse(fs.readFileSync(path.join(project, '.hyper-studio', 'editor.json'), 'utf8'))
  return model.timelines.find(entry => entry.id === model.activeTimelineId)
}
const menu = async (section, item) => {
  await page.getByRole('button', { name: section, exact: true }).last().click()
  await page.getByText(item, { exact: true }).last().click()
}
const trackHeader = name => page.getByText(name, { exact: true }).first().locator('..').locator('..')
const displayIndex = name => {
  const tracks = timeline().tracks
  const subtitles = tracks.filter(track => track.type === 'subtitle')
  const videos = tracks.filter(track => track.type !== 'subtitle' && track.kind !== 'audio').reverse()
  const audios = tracks.filter(track => track.kind === 'audio')
  return [...subtitles, ...videos, ...audios].findIndex(track => track.name === name)
}
const dragAssetToTrack = async (assetId, trackName) => {
  const index = displayIndex(trackName)
  assert.ok(index >= 0, `missing ${trackName} display row`)
  const target = page.locator('[data-track-bg="true"]').nth(index)
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  assert.ok(box && box.height > 20, `${trackName} drop row is not visible`)
  const before = await page.evaluate(() => window.__editorTrackDrops.length)
  await page.locator(`[data-asset-card][data-asset-id="${assetId}"]`).dragTo(target, {
    targetPosition: { x: 120, y: Math.min(20, box.height / 2) },
    timeout: 15000,
  })
  const drops = await page.evaluate(() => window.__editorTrackDrops)
  assert.equal(drops.length, before + 1, `${trackName} did not receive a drop event`)
  assert.equal(drops.at(-1).target, 'track', `${trackName} drop hit another element`)
  assert.ok(drops.at(-1).types.includes('asset'), `${trackName} drop lacked asset data`)
  fs.writeFileSync(path.join(home, 'drag-evidence.json'), JSON.stringify(drops, null, 2))
}

try {
  app = await electron.launch({ executablePath: exe, cwd: root, env, args: ['--no-sandbox', '--disable-gpu'], timeout: 120000 })
  page = await app.firstWindow({ timeout: 45000 })
  await page.waitForLoadState('domcontentloaded', { timeout: 45000 })
  await page.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), path.join(home, 'shared'))
  await page.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped?.({ skipped: true }))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { location.hash = '#/projects' })
  await page.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }) }, project)
  await page.getByTestId('new-project-card').click()
  await page.getByPlaceholder('Project name').fill('Editor track commands smoke')
  await page.getByText('Editor mode', { exact: true }).click()
  await page.getByText('Choose a folder', { exact: true }).click()
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.getByRole('tablist', { name: 'Editor views' }).waitFor({ state: 'visible', timeout: 45000 })
  await page.getByRole('tab', { name: 'Video Editor' }).click()
  await waitUntil(() => timeline()?.tracks.length >= 5, 'default Editor tracks')
  record('Create Editor project with default tracks', 'V1 and A1 available')

  await page.locator('input[type=file][accept="video/*,audio/*,image/*"]').first().setInputFiles([imagePath, audioPath])
  await waitUntil(() => {
    const assets = JSON.parse(fs.readFileSync(path.join(project, '.hyper-studio', 'editor.json'), 'utf8')).assets
    return assets.some(asset => /assets\/red\.png$/.test(asset.path)) && assets.some(asset => /assets\/tone\.wav$/.test(asset.path))
  }, 'imported image and audio assets', 45000)
  const assets = JSON.parse(fs.readFileSync(path.join(project, '.hyper-studio', 'editor.json'), 'utf8')).assets
  const imageAsset = assets.find(asset => /assets\/red\.png$/.test(asset.path))
  const audioAsset = assets.find(asset => /assets\/tone\.wav$/.test(asset.path))
  assert.ok(imageAsset && audioAsset)
  await page.evaluate(() => {
    window.__editorTrackDrops = []
    document.addEventListener('drop', event => {
      const target = event.target instanceof Element ? event.target : null
      window.__editorTrackDrops.push({
        target: target?.closest('[data-track-bg]') ? 'track' : target?.tagName ?? 'unknown',
        types: [...(event.dataTransfer?.types ?? [])],
        x: event.clientX,
        y: event.clientY,
      })
    }, true)
  })
  record('Import disposable PNG and WAV', 'both assets persisted')

  const v1 = () => timeline().tracks.find(track => track.name === 'V1')
  assert.equal(v1().kind, 'video')
  assert.notEqual(v1().sourcePatched, false)
  await trackHeader('V1').locator('button').nth(0).click()
  await waitUntil(() => v1().sourcePatched === false, 'V1 source unpatched')
  await dragAssetToTrack(imageAsset.id, 'V1')
  await page.waitForTimeout(400)
  assert.equal(timeline().clips.length, 0, 'unpatched V1 accepted an image clip')
  await trackHeader('V1').locator('button').nth(0).click()
  await waitUntil(() => v1().sourcePatched === true, 'V1 source patched')
  record('V1 source patch gates image insertion', 'unpatched drop ignored, patch restored')

  await trackHeader('V1').locator('button').nth(1).click()
  await waitUntil(() => v1().locked === true, 'V1 locked')
  await dragAssetToTrack(imageAsset.id, 'V1')
  await page.waitForTimeout(400)
  assert.equal(timeline().clips.length, 0, 'locked V1 accepted an image clip')
  await trackHeader('V1').locator('button').nth(1).click()
  await waitUntil(() => v1().locked === false, 'V1 unlocked')
  await dragAssetToTrack(imageAsset.id, 'V1')
  await waitUntil(() => timeline().clips.some(clip => clip.assetId === imageAsset.id), 'image clip on V1')
  const imageClip = timeline().clips.find(clip => clip.assetId === imageAsset.id)
  assert.equal(timeline().tracks[imageClip.trackIndex].name, 'V1')
  record('V1 lock gates insertion and unlock restores it', `image clip ${imageClip.id} on V1`)

  const a1 = timeline().tracks.find(track => track.name === 'A1')
  assert.ok(a1 && a1.kind === 'audio' && !a1.locked && a1.sourcePatched !== false)
  await dragAssetToTrack(audioAsset.id, 'A1')
  await waitUntil(() => timeline().clips.some(clip => clip.assetId === audioAsset.id && clip.type === 'audio'), 'audio clip on A1')
  const audioClip = timeline().clips.find(clip => clip.assetId === audioAsset.id && clip.type === 'audio')
  assert.equal(timeline().tracks[audioClip.trackIndex].name, 'A1')
  record('Place imported WAV on patched audio track', `audio clip ${audioClip.id} on A1`)

  await page.locator(`[data-clip-id="${imageClip.id}"]`).click()
  await menu('Clip', 'Duplicate Clip')
  await waitUntil(() => timeline().clips.filter(clip => clip.assetId === imageAsset.id).length === 2, 'duplicated image clip')
  record('Clip menu Duplicate Clip', 'second image clip persisted')
  await menu('Clip', 'Flip Horizontal')
  await waitUntil(() => timeline().clips.find(clip => clip.id === imageClip.id)?.flipH === true, 'image clip flipped horizontally')
  record('Clip menu Flip Horizontal', 'selected clip flipH persisted')
  await menu('Clip', 'Mute Clip')
  await waitUntil(() => timeline().clips.find(clip => clip.id === imageClip.id)?.muted === true, 'image clip muted')
  record('Clip menu Mute Clip', 'selected clip muted persisted')
} catch (error) {
  results.push({ name: 'smoke', status: 'FAIL', detail: String(error) })
  fs.writeFileSync(path.join(home, 'results.json'), JSON.stringify(results, null, 2))
  if (page) await page.screenshot({ path: path.join(home, 'failure.png') }).catch(() => {})
  throw error
} finally {
  if (app) await app.close()
  process.stdout.write(`Evidence: ${home}\n`)
}

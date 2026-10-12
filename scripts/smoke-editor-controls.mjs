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
fs.copyFileSync(path.join(root, 'apps', 'desktop', 'public', 'favicon.png'), redPng)
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
const sessionLogText = () => {
  const logDir = path.join(home, 'user-data', 'logs')
  if (!fs.existsSync(logDir)) return ''
  return fs.readdirSync(logDir)
    .filter(name => name.startsWith('session_') && name.endsWith('.log'))
    .map(name => fs.readFileSync(path.join(logDir, name), 'utf8'))
    .join('\n')
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
  await page.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped?.({ skipped: true }))
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

  const subtitleExportPath = path.join(home, 'subtitle-export.srt')
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath })
  }, subtitleExportPath)
  await page.getByRole('button', { name: 'Export SRT' }).click()
  await waitUntil(() => fs.existsSync(subtitleExportPath), 'SRT export file')
  assert.match(fs.readFileSync(subtitleExportPath, 'utf8'), /Smoke caption/)
  record('Export SRT', 'saved subtitle file contains the imported cue')

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
  await waitUntil(() => {
    const paths = new Set(readEditor().assets.map(asset => asset.path))
    return paths.has('assets/red.png') && paths.has('assets/tone.wav')
  }, 'reopened imported assets')
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
  await page.waitForTimeout(1000)
  await menu('Edit', 'Undo')
  await activeCard.getByText('0 clips', { exact: true }).waitFor({ state: 'visible' })
  await menu('Edit', 'Redo')
  await activeCard.getByText('1 clip', { exact: true }).waitFor({ state: 'visible' })
  record('Undo remains available after autosave', 'clip count 1 → 0 → 1 after persisted overlay')

  await page.locator('button[title^="Workflow mode"]').click()
  await page.getByRole('button', { name: /Shared files \(\d+\)/ }).waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('button[title^="Editor mode"]').click()
  await activeCard.getByText('1 clip', { exact: true }).waitFor({ state: 'visible' })
  await menu('Edit', 'Undo')
  await activeCard.getByText('0 clips', { exact: true }).waitFor({ state: 'visible' })
  await menu('Edit', 'Redo')
  await activeCard.getByText('1 clip', { exact: true }).waitFor({ state: 'visible' })
  assert.equal(await page.locator('button[title^="Editor mode"]').getAttribute('aria-pressed'), 'true')
  record('Editor Undo and focus after Workflow toggle', 'Undo history survives both mode changes')

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

  const timelineCountBeforeImport = readEditor().timelines.length
  await page.locator('div.fixed.inset-0.z-50').first().click({ position: { x: 5, y: 5 } })
  await menu('File', 'Import Timeline (XML)...')
  await page.locator('input[type=file][accept=".xml,.fcpxml,.aaf"]').setInputFiles(packagePath)
  await page.getByRole('button', { name: 'Import Timeline', exact: true }).last().waitFor({ state: 'visible', timeout: 15000 })
  await page.getByRole('button', { name: 'Import Timeline', exact: true }).last().click()
  try {
    await waitUntil(() => readEditor().timelines.length === timelineCountBeforeImport + 1, 'imported FCPXML timeline', 20000)
  } catch (error) {
    throw new Error(`${error}; import dialog: ${(await page.locator('body').innerText()).slice(-700)}`)
  }
  assert.ok(activeTimeline()?.clips.length >= 1, 'imported FCPXML timeline has no media clip')
  record('Import exported FCPXML timeline', 'new timeline contains the exported media clip')

  // Keep the gesture checks on a fresh timeline so each persisted change has one cause.
  await menu('File', 'New Timeline')
  await waitUntil(() => activeTimeline()?.clips.length === 0, 'empty gesture timeline')
  const gestureTimelineId = activeTimeline().id
  const assetCard = page.locator(`[data-asset-card][data-asset-id="${imageAsset.id}"]`)
  const gestureTracks = activeTimeline().tracks
  const subtitleCount = gestureTracks.filter(track => track.type === 'subtitle').length
  const videoTracks = gestureTracks.filter(track => track.type !== 'subtitle' && track.kind !== 'audio')
  assert.ok(videoTracks.length > 0, 'gesture timeline has no video track')
  const targetTrack = videoTracks.find(track => track.kind === 'video' && !track.locked && track.sourcePatched !== false)
  assert.ok(targetTrack, 'gesture timeline has no unlocked source-patched video track')
  assert.equal(targetTrack.kind, 'video')
  assert.notEqual(targetTrack.sourcePatched, false)
  const displayIndex = subtitleCount + videoTracks.length - 1 - videoTracks.indexOf(targetTrack)
  const dropTrack = page.locator('[data-track-bg="true"]').nth(displayIndex)
  assert.equal(await page.locator('[data-track-bg="true"]').count(), gestureTracks.length)
  await dropTrack.scrollIntoViewIfNeeded()
  const dropTrackBox = await dropTrack.boundingBox()
  const assetCardBox = await assetCard.boundingBox()
  assert.ok(dropTrackBox && dropTrackBox.height > 20, 'video track is not visible for asset drag')
  assert.ok(assetCardBox, 'imported image card is not visible for drag')
  await page.evaluate(() => {
    window.__editorDragEvents = []
    for (const type of ['dragstart', 'dragenter', 'dragover', 'drop', 'dragend']) {
      document.addEventListener(type, event => {
        const target = event.target instanceof Element ? event.target : null
        window.__editorDragEvents.push({
          type,
          target: target?.closest('[data-track-bg]') ? 'track' : target?.closest('[data-asset-card]') ? 'asset-card' : target?.tagName ?? 'unknown',
          assetId: target?.closest('[data-asset-card]')?.getAttribute('data-asset-id') ?? null,
          types: [...(event.dataTransfer?.types ?? [])],
          x: event.clientX,
          y: event.clientY,
        })
      }, { capture: true, once: type === 'drop' || type === 'dragend' })
    }
  })
  await assetCard.dragTo(dropTrack, {
    targetPosition: { x: 120, y: Math.min(20, dropTrackBox.height / 2) },
    timeout: 15000,
  })
  fs.writeFileSync(path.join(home, 'drag-evidence.json'), JSON.stringify({
    targetTrack: { name: targetTrack.name, kind: targetTrack.kind, type: targetTrack.type, sourcePatched: targetTrack.sourcePatched, displayIndex },
    assetCardBox,
    dropTrackBox,
    events: await page.evaluate(() => window.__editorDragEvents),
  }, null, 2))
  await waitUntil(() => activeTimeline()?.clips.some(clip => clip.assetId === imageAsset.id), 'dragged image clip', 20000)
  assert.equal(activeTimeline()?.id, gestureTimelineId)
  let gestureClip = activeTimeline().clips.find(clip => clip.assetId === imageAsset.id)
  record('Drag imported asset onto video track', `${targetTrack.name}; clip ${gestureClip.id} at ${gestureClip.startTime.toFixed(2)}s`)

  const clipLocator = () => page.locator(`[data-clip-id="${gestureClip.id}"]`)
  await menu('Tools', 'Selection Tool')
  assert.match(await page.locator('button').filter({ hasText: 'Selection Tool' }).first().getAttribute('class'), /bg-brand/)
  const initialStart = gestureClip.startTime
  const firstBox = await clipLocator().boundingBox()
  assert.ok(firstBox, 'dragged clip is not visible')
  const viewport = page.viewportSize()
  const hitProbe = await page.evaluate(({ clipId, box }) => {
    const offsets = [25, 45, 75, 100]
    const heights = [box.height / 2, 10, box.height - 10]
    const candidates = []
    for (const ox of offsets) {
      for (const oy of heights) {
        const x = box.x + ox
        const y = box.y + oy
        if (x >= window.innerWidth - 20 || y >= window.innerHeight - 5) continue
        const hit = document.elementFromPoint(x, y)
        const hitClipId = hit instanceof Element ? hit.closest('[data-clip-id]')?.getAttribute('data-clip-id') : null
        const inButton = hit instanceof Element && Boolean(hit.closest('button'))
        candidates.push({ x, y, tag: hit?.tagName ?? null, hitClipId, inButton })
        if (hitClipId === clipId && !inButton) return { point: { x, y }, candidates }
      }
    }
    return { point: null, candidates }
  }, { clipId: gestureClip.id, box: firstBox })
  const evidencePath = path.join(home, 'clip-move-evidence.json')
  if (!hitProbe.point) {
    fs.writeFileSync(evidencePath, JSON.stringify({
      stage: 'no unobstructed clip hit target', clipId: gestureClip.id,
      initialStart, firstBox, viewport, hitProbe,
    }, null, 2))
  }
  assert.ok(hitProbe.point, `no unobstructed clip hit target: ${JSON.stringify(hitProbe.candidates)}`)
  // Exercise the thumbnail itself: native image dragging must not steal the
  // pointer stream from the timeline's clip-move handler.
  assert.equal(hitProbe.candidates.at(-1)?.tag, 'IMG', 'clip-move fixture must hit its thumbnail')
  assert.equal(await clipLocator().locator('img').first().getAttribute('draggable'), 'false')
  const moveStartX = hitProbe.point.x
  const moveY = hitProbe.point.y
  const moveDeltaX = Math.min(40, Math.floor((viewport?.width ?? 984) - moveStartX - 20))
  assert.ok(moveDeltaX >= 25, `not enough visible timeline room to move clip: ${moveDeltaX}px`)
  await page.evaluate(() => {
    window.__editorClipMoveEvents = []
    for (const type of ['mousedown', 'mousemove', 'mouseup']) {
      document.addEventListener(type, event => {
        const target = event.target instanceof Element ? event.target : null
        window.__editorClipMoveEvents.push({
          type, x: event.clientX, y: event.clientY,
          tag: target?.tagName ?? null,
          clipId: target?.closest('[data-clip-id]')?.getAttribute('data-clip-id') ?? null,
        })
      }, true)
    }
  })
  const saveMoveEvidence = async stage => {
    const dom = await page.evaluate(({ clipId, x, y }) => {
      const clip = document.querySelector(`[data-clip-id="${clipId}"]`)
      const hit = document.elementFromPoint(x, y)
      return {
        className: clip?.className ?? null,
        hitTag: hit?.tagName ?? null,
        hitClipId: hit instanceof Element ? hit.closest('[data-clip-id]')?.getAttribute('data-clip-id') ?? null : null,
        events: window.__editorClipMoveEvents,
      }
    }, { clipId: gestureClip.id, x: moveStartX, y: moveY })
    fs.writeFileSync(evidencePath, JSON.stringify({
      stage, clipId: gestureClip.id, initialStart, firstBox, viewport, hitProbe,
      from: { x: moveStartX, y: moveY }, to: { x: moveStartX + moveDeltaX, y: moveY }, dom,
    }, null, 2))
  }
  await saveMoveEvidence('before mousedown')
  await page.mouse.move(moveStartX, moveY)
  await page.mouse.down()
  try {
    await page.waitForFunction(id => document.querySelector(`[data-clip-id="${id}"]`)?.classList.contains('cursor-grabbing'), gestureClip.id, { timeout: 2500 })
  } catch {
    await saveMoveEvidence('mousedown did not enter dragging state')
    await page.mouse.up().catch(() => {})
    throw new Error(`Clip mousedown did not enter dragging state; evidence: ${evidencePath}`)
  }
  await saveMoveEvidence('dragging state entered')
  await page.mouse.move(moveStartX + moveDeltaX, moveY, { steps: 8 })
  await page.mouse.up()
  await saveMoveEvidence('after mouseup')
  await waitUntil(() => activeTimeline()?.clips.find(clip => clip.id === gestureClip.id)?.startTime > initialStart + 0.2, 'moved image clip')
  gestureClip = activeTimeline().clips.find(clip => clip.id === gestureClip.id)
  record('Move timeline clip with Selection Tool', `${initialStart.toFixed(2)}s → ${gestureClip.startTime.toFixed(2)}s`)

  await menu('Tools', 'Blade Tool')
  assert.match(await page.locator('button').filter({ hasText: 'Blade Tool' }).first().getAttribute('class'), /bg-brand/)
  // A moved clip can extend beyond the narrow installed-app viewport. Center its
  // scroll position before choosing a point, then prove the point hits that clip.
  await clipLocator().evaluate(element => element.scrollIntoView({ block: 'nearest', inline: 'center' }))
  const bladeTarget = await clipLocator().evaluate(element => {
    const box = element.getBoundingClientRect()
    const viewport = element.closest('.overflow-auto')?.getBoundingClientRect()
    if (!viewport) return null
    const left = Math.max(box.left + 20, viewport.left + 12)
    const right = Math.min(box.right - 20, viewport.right - 12)
    const x = Math.min(Math.max(box.left + box.width / 2, left), right)
    const y = box.top + box.height / 2
    const hit = document.elementFromPoint(x, y)
    return { x, y, visibleWidth: right - left, hitClipId: hit?.closest('[data-clip-id]')?.getAttribute('data-clip-id') }
  })
  assert.ok(bladeTarget && bladeTarget.visibleWidth > 20, 'clip has no visible interior for blade split')
  assert.equal(bladeTarget.hitClipId, gestureClip.id, 'blade point must hit the moved clip')
  await page.mouse.click(bladeTarget.x, bladeTarget.y)
  await waitUntil(() => activeTimeline()?.clips.length === 2, 'blade split into two clips')
  const splitClips = [...activeTimeline().clips].sort((a, b) => a.startTime - b.startTime)
  assert.ok(splitClips.every(clip => clip.assetId === imageAsset.id))
  assert.ok(Math.abs(splitClips[0].startTime + splitClips[0].duration - splitClips[1].startTime) < 0.1)
  record('Blade splits dragged clip', `${splitClips[0].duration.toFixed(2)}s + ${splitClips[1].duration.toFixed(2)}s`)

  await page.keyboard.press('v')
  assert.match(await page.locator('button').filter({ hasText: 'Selection Tool' }).first().getAttribute('class'), /bg-brand/)
  const trimClip = splitClips[1]
  const durationBeforeTrim = trimClip.duration
  const trimLocator = page.locator(`[data-clip-id="${trimClip.id}"]`)
  await trimLocator.evaluate(element => element.scrollIntoView({ block: 'nearest', inline: 'center' }))
  const trimBox = await trimLocator.boundingBox()
  assert.ok(trimBox && trimBox.width > 30, 'split clip is too narrow to trim')
  await page.mouse.move(trimBox.x + trimBox.width - 5, trimBox.y + trimBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(trimBox.x + trimBox.width - 35, trimBox.y + trimBox.height / 2, { steps: 8 })
  await page.mouse.up()
  await waitUntil(() => activeTimeline()?.clips.find(clip => clip.id === trimClip.id)?.duration < durationBeforeTrim - 0.1, 'shortened clip edge')
  record('Selection shortcut and right-edge trim', `${durationBeforeTrim.toFixed(2)}s → ${activeTimeline().clips.find(clip => clip.id === trimClip.id).duration.toFixed(2)}s`)
  await menu('Edit', 'Undo')
  await waitUntil(() => Math.abs(activeTimeline()?.clips.find(clip => clip.id === trimClip.id)?.duration - durationBeforeTrim) < 0.1, 'Undo trim')
  assert.deepEqual(
    activeTimeline().clips.map(clip => clip.id).sort(),
    splitClips.map(clip => clip.id).sort(),
    'one Undo must restore the trim without undoing the preceding blade split',
  )
  assert.ok(
    Math.abs(activeTimeline().clips.find(clip => clip.id === trimClip.id)?.startTime - trimClip.startTime) < 0.1,
    'Undo trim must preserve the moved and split clip position',
  )
  await menu('Edit', 'Redo')
  await waitUntil(() => activeTimeline()?.clips.find(clip => clip.id === trimClip.id)?.duration < durationBeforeTrim - 0.1, 'Redo trim')
  record('Trim Undo and Redo', 'edge returns to original duration, then shortened duration')

  const copiedPng = path.join(project, 'assets', 'red.png')
  const temporarilyUnavailablePng = path.join(fixture, 'red-temporarily-unavailable.png')
  const nativeFailurePath = path.join(home, 'expected-native-failure.mp4')
  fs.renameSync(copiedPng, temporarilyUnavailablePng)
  try {
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, nativeFailurePath)
    await page.getByRole('button', { name: 'Export', exact: true }).last().click()
    await page.getByRole('button', { name: 'Export Video' }).click()
    await page.getByText('Export failed', { exact: true }).waitFor({ state: 'visible', timeout: 15000 })
    await page.getByText(/Source file not found: red\.png/).waitFor({ state: 'visible' })
    assert.equal(fs.existsSync(nativeFailurePath), false)
    await page.getByRole('button', { name: 'Try Again' }).click()
    await page.getByRole('button', { name: 'Export Video' }).waitFor({ state: 'visible' })
    record('Native export failure returns to settings', 'missing disposable source reports error; Try Again restores controls')
  } finally {
    fs.renameSync(temporarilyUnavailablePng, copiedPng)
  }

  const cancelPath = path.join(home, 'editor-canceled-render.mp4')
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath })
  }, cancelPath)
  await page.locator('div.fixed.inset-0.z-50 select').first().selectOption('3840x2160')
  await page.getByRole('button', { name: 'Export Video' }).click()
  await waitUntil(() => sessionLogText().includes('[ffmpeg] spawn:'), 'native ffmpeg export start', 15000)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await waitUntil(() => sessionLogText().includes('Stopping active export process'), 'native ffmpeg cancellation', 15000)
  await page.getByRole('button', { name: 'Export Video' }).waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(1000)
  assert.equal(await page.getByText('Export failed', { exact: true }).count(), 0)
  assert.equal(await page.getByText('Export complete', { exact: true }).count(), 0)
  assert.equal(fs.existsSync(cancelPath), false)
  record('Cancel active native video export', 'ffmpeg process started and stopped; settings remain available')

  const renderPath = path.join(home, 'editor-local-render.mp4')
  await app.evaluate(({ dialog }) => { dialog.showSaveDialog = async () => ({ canceled: true }) })
  await page.getByRole('button', { name: 'Export Video' }).click()
  await page.getByRole('button', { name: 'Export Video' }).waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(250)
  assert.equal(await page.getByText('Export failed', { exact: true }).count(), 0)
  record('Cancel video save dialog', 'export returns to settings without output')

  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath })
  }, renderPath)
  await page.locator('div.fixed.inset-0.z-50 select').first().selectOption('1280x720')
  await page.getByRole('button', { name: 'Export Video' }).click()
  await page.getByText('Export complete', { exact: true }).waitFor({ state: 'visible', timeout: 120000 })
  await waitUntil(() => fs.existsSync(renderPath) && fs.statSync(renderPath).size > 1024, 'rendered MP4 file', 10000)
  const mp4 = fs.readFileSync(renderPath)
  assert.equal(mp4.toString('ascii', 4, 8), 'ftyp', 'rendered file is missing MP4 ftyp atom')
  assert.ok(mp4.includes(Buffer.from('moov')), 'rendered file is missing MP4 moov atom')
  record('Render local H.264 video', `${path.basename(renderPath)}; ${mp4.length} bytes; ftyp and moov atoms`)
} catch (error) {
  results.push({ name: 'smoke', status: 'FAIL', detail: String(error) })
  fs.writeFileSync(path.join(home, 'results.json'), JSON.stringify(results, null, 2))
  if (page) await page.screenshot({ path: path.join(home, 'failure.png') }).catch(() => {})
  throw error
} finally {
  if (app) await app.close()
  process.stdout.write(`Evidence: ${home}\n`)
}

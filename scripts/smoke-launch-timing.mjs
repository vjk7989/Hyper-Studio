import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executablePath = path.resolve(process.env.HYPER_STUDIO_SMOKE_EXE || '')
if (!executablePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(executablePath)) {
  throw new Error('Set HYPER_STUDIO_SMOKE_EXE to an executable inside this repository')
}

const home = path.join(root, '.local-tmp', `launch-timing-${Date.now()}`)
const shared = path.join(home, 'shared-storage')
for (const folder of [home, shared, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) {
  fs.mkdirSync(folder, { recursive: true })
}
const env = {
  ...process.env,
  HOME: home, USERPROFILE: home, APPDATA: path.join(home, 'appdata'),
  LOCALAPPDATA: path.join(home, 'localappdata'), TEMP: path.join(home, 'temp'),
  TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
}
const launchedAt = performance.now()
const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], timeout: 120000 })
try {
  const window = await app.firstWindow({ timeout: 45000 })
  await window.waitForLoadState('domcontentloaded')
  const coldWindowMs = Math.round(performance.now() - launchedAt)
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await window.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped({ skipped: true }))
  const reloadUsableMs = []
  for (let i = 0; i < 3; i++) {
    const startedAt = performance.now()
    await window.reload({ waitUntil: 'domcontentloaded' })
    await window.evaluate(() => { window.location.hash = '#/projects' })
    await window.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 30000 })
    reloadUsableMs.push(Math.round(performance.now() - startedAt))
  }
  const sorted = [...reloadUsableMs].sort((a, b) => a - b)
  const result = { coldWindowMs, reloadUsableMs, medianReloadUsableMs: sorted[1] }
  const evidence = path.join(home, 'timings.json')
  fs.writeFileSync(evidence, JSON.stringify(result, null, 2))
  process.stdout.write(`${JSON.stringify({ ...result, evidence })}\n`)
} finally {
  await app.evaluate(({ BrowserWindow }) => { for (const liveWindow of BrowserWindow.getAllWindows()) liveWindow.destroy() })
  await app.close()
}

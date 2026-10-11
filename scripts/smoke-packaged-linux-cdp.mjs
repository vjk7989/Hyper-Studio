import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

if (process.platform !== 'linux') throw new Error('This smoke is for packaged Linux only')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executable = process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps/desktop/release/linux-unpacked/hyper-studio')
if (!fs.existsSync(executable)) throw new Error(`Packaged Linux executable is missing: ${executable}`)
const home = path.join(root, '.local-tmp/packaged-electron-smoke/linux')
// Chromium's Linux process singleton binds an AF_UNIX socket inside TMPDIR.
// Keep this path short: sockaddr_un.sun_path has a 108-byte limit.
const socketRoot = path.join(root, '.local-tmp/hs-linux')
const temp = path.join(socketRoot, 'tmp')
const userData = path.join(socketRoot, 'ud')
if (Buffer.byteLength(temp) + 40 >= 108) throw new Error(`Repository path is too deep for Chromium's Linux singleton socket: ${temp}`)
for (const folder of [home, temp, userData, path.join(home, 'config'), path.join(home, 'data'), path.join(home, 'state'), path.join(home, 'cache')]) fs.mkdirSync(folder, { recursive: true })
// Retain bounded failure logs under the checkout.
const stdoutFd = fs.openSync(path.join(home, 'electron-stdout.log'), 'w')
const stderrFd = fs.openSync(path.join(home, 'electron-stderr.log'), 'w')
const port = await new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    server.close(() => resolve(address.port))
  })
})
const env = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  TMPDIR: temp, TEMP: temp, TMP: temp,
  XDG_CONFIG_HOME: path.join(home, 'config'), XDG_DATA_HOME: path.join(home, 'data'),
  XDG_STATE_HOME: path.join(home, 'state'), XDG_CACHE_HOME: path.join(home, 'cache'),
  HYPER_STUDIO_USER_DATA: userData,
  ELECTRON_ENABLE_LOGGING: '1', ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
}
const child = spawn(executable, [`--remote-debugging-port=${port}`, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'], { cwd: root, env, stdio: ['ignore', stdoutFd, stderrFd] })
let exit = null
child.once('exit', (code, signal) => { exit = { code, signal } })
child.once('error', error => { exit = { error: String(error) } })
let browser
let page
let stage = 'launch'
try {
  const endpoint = `http://127.0.0.1:${port}`
  const deadline = Date.now() + 60000
  let version
  while (Date.now() < deadline && !version && !exit) {
    try {
      const response = await fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(1000) })
      if (response.ok) version = await response.json()
    } catch { /* Chromium starts after the main process. */ }
    if (!version) await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!version?.webSocketDebuggerUrl) throw new Error(`CDP endpoint did not start; exit=${JSON.stringify(exit)}`)
  stage = 'window'
  browser = await chromium.connectOverCDP(endpoint, { timeout: 30000 })
  const context = browser.contexts()[0]
  if (!context) throw new Error('Electron opened CDP without a browser context')
  const windowDeadline = Date.now() + 45000
  while (Date.now() < windowDeadline && !page && !exit) {
    page = context.pages().find(candidate => candidate.url().startsWith('file:'))
    if (!page) await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!page) throw new Error(`Electron opened CDP without an app window; pages=${JSON.stringify(context.pages().map(item => item.url()))}; exit=${JSON.stringify(exit)}`)
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 })
  if (!(await page.title()).includes('Hyper-Studio')) throw new Error(`Unexpected title: ${await page.title()}`)
  await page.screenshot({ path: path.join(home, 'first-run.png') })
  console.log('Linux direct packaged launch: CDP window and Hyper-Studio title passed')

  stage = 'workspace'
  const shared = path.join(home, 'shared-storage')
  const project = path.join(home, 'workflow-project')
  fs.mkdirSync(shared, { recursive: true })
  fs.mkdirSync(project, { recursive: true })
  await page.evaluate(folder => window.electronAPI.setSharedStorageRoot({ folder }), shared)
  await page.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped({ skipped: true }))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { window.location.hash = '#/projects' })
  await page.getByTestId('new-project-card').waitFor({ state: 'visible', timeout: 45000 })
  await page.screenshot({ path: path.join(home, 'projects.png') })
  const projectId = 'linux-cdp-smoke'
  const manifest = await page.evaluate(({ folder, projectId }) => window.electronAPI.openWorkspaceProject({ folder, projectId, name: 'Linux package smoke', mode: 'workflow' }), { folder: project, projectId })
  if (manifest.projectId !== projectId) throw new Error(`Unexpected project manifest: ${JSON.stringify(manifest)}`)

  stage = 'workflow-engine'
  const engine = await page.evaluate(id => window.electronAPI.startWorkflowEngine({ projectId: id }), projectId)
  if (engine.state !== 'running' || !engine.url) throw new Error(`Managed workflow engine did not start: ${JSON.stringify(engine)}`)
  const prompt = {
    '1': { class_type: 'EmptyImage', inputs: { width: 64, height: 64, batch_size: 1, color: 0 } },
    '2': { class_type: 'SaveImage', inputs: { images: ['1', 0], filename_prefix: 'hyper-studio-linux-package' } },
  }
  const submission = await fetch(new URL('prompt', engine.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, client_id: 'hyper-studio-linux-package-smoke' }) })
  const submitted = await submission.json()
  if (!submission.ok || !submitted.prompt_id) throw new Error(`Workflow prompt rejected: ${JSON.stringify(submitted)}`)
  let completed = false
  for (let attempt = 0; attempt < 120; attempt++) {
    const response = await fetch(new URL(`history/${submitted.prompt_id}`, engine.url))
    const history = await response.json()
    if (history[submitted.prompt_id]) { completed = true; break }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!completed) throw new Error('Zero-model workflow prompt did not finish')
  const media = await page.evaluate(id => window.electronAPI.listWorkspaceMedia({ projectId: id }), projectId)
  if (!media.some(item => item.relativePath.includes('hyper-studio-linux-package') && item.relativePath.endsWith('.png'))) throw new Error('Generated PNG did not enter the shared media index')
  await page.screenshot({ path: path.join(home, 'workflow-engine.png') })
  console.log(`Linux packaged workflow: engine, EmptyImage → SaveImage, shared media index passed (${media.length} media)`)
} catch (error) {
  if (page) await page.screenshot({ path: path.join(home, `failure-${stage}.png`) }).catch(() => {})
  console.error(`Linux packaged smoke failed at ${stage}: ${error instanceof Error ? error.message : String(error)}`)
  const tail = fs.existsSync(path.join(home, 'electron-stderr.log')) ? fs.readFileSync(path.join(home, 'electron-stderr.log'), 'utf8').slice(-2000) : ''
  if (tail) console.error(`Electron stderr tail: ${tail}`)
  throw error
} finally {
  if (browser) await browser.close().catch(() => {})
  if (!child.killed && exit === null) child.kill('SIGTERM')
  await new Promise(resolve => setTimeout(resolve, 500))
  if (exit === null) child.kill('SIGKILL')
  fs.closeSync(stdoutFd); fs.closeSync(stderrFd)
}

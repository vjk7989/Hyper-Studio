import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { prepareWorkflowPaths, workflowArguments, workflowCpuOnly } from '../apps/desktop/electron/workflow-engine-config.ts'
import { listMedia, openProjectFolder } from '../apps/desktop/electron/project-workspace.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const shared = path.join(root, '.local-cache', 'shared-storage')
const python = path.join(shared, 'runtimes', 'workflow', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python3')
const frontend = path.join(root, 'apps', 'workflow-ui', 'dist')
const source = path.join(root, 'services', 'workflow')
const smoke = path.join(root, '.local-tmp', 'workflow-smoke')
if (!fs.existsSync(python) || !fs.existsSync(path.join(frontend, 'index.html'))) {
  throw new Error('Bootstrap the workflow runtime and build the workflow UI before running this smoke test')
}
fs.mkdirSync(smoke, { recursive: true })
const project = path.join(smoke, 'project')
fs.mkdirSync(project, { recursive: true })
openProjectFolder({ folder: project, projectId: 'workflow-smoke', name: 'Workflow smoke', mode: 'workflow' })
const paths = prepareWorkflowPaths(project, shared)
const server = net.createServer()
await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
const port = server.address().port
await new Promise(resolve => server.close(resolve))
const output = fs.openSync(path.join(smoke, 'engine.log'), 'w')
const env = { ...process.env, TEMP: paths.temp, TMP: paths.temp, TMPDIR: paths.temp,
    XDG_CACHE_HOME: paths.cache, HF_HOME: path.join(shared, 'caches', 'huggingface'),
    TORCH_HOME: path.join(shared, 'caches', 'torch'), PYTHONPYCACHEPREFIX: path.join(paths.cache, 'pycache') }
const child = spawn(python, [path.join(source, 'main.py'), ...workflowArguments(paths, frontend, port), ...(workflowCpuOnly(python, env) ? ['--cpu'] : [])], {
  cwd: source, windowsHide: true, stdio: ['ignore', output, output], env,
})
let exited = false
child.once('exit', () => { exited = true })
try {
  const deadline = Date.now() + 90000
  let healthy = false
  while (Date.now() < deadline && !exited) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/system_stats`, { signal: AbortSignal.timeout(1000) })
      if (response.ok) { healthy = true; break }
    } catch { /* Server has not bound yet. */ }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  if (!healthy) throw new Error(`Workflow engine did not become healthy; inspect ${path.join(smoke, 'engine.log')}`)
  const page = await fetch(`http://127.0.0.1:${port}/`)
  if (!page.ok || !(await page.text()).includes('<html')) throw new Error('Workflow canvas did not load')
  const prompt = {
    '1': { class_type: 'EmptyImage', inputs: { width: 64, height: 64, batch_size: 1, color: 0 } },
    '2': { class_type: 'SaveImage', inputs: { images: ['1', 0], filename_prefix: 'hyper-studio-smoke' } },
  }
  const submission = await fetch(`http://127.0.0.1:${port}/prompt`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, client_id: 'hyper-studio-smoke' }),
  })
  const submitted = await submission.json()
  if (!submission.ok || !submitted.prompt_id) throw new Error(`Workflow smoke prompt was rejected: ${JSON.stringify(submitted)}`)
  const executionDeadline = Date.now() + 30000
  let completed = false
  while (Date.now() < executionDeadline) {
    const history = await (await fetch(`http://127.0.0.1:${port}/history/${submitted.prompt_id}`)).json()
    if (history[submitted.prompt_id]) { completed = true; break }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!completed) throw new Error('Workflow smoke prompt did not complete')
  if (!listMedia(project).some(entry => entry.origin === 'workflow' && entry.relativePath.endsWith('.png'))) {
    throw new Error('Workflow output did not enter the shared media index')
  }
  if (process.argv.includes('--browser')) {
    const { chromium } = await import('../apps/workflow-ui/node_modules/@playwright/test/index.mjs')
    const executablePath = process.platform === 'win32'
      ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      : process.env.HYPER_STUDIO_CHROME_PATH
    if (!executablePath || !fs.existsSync(executablePath)) throw new Error('A local Chrome binary is required for the browser smoke')
    const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] })
    try {
      const page = await browser.newPage()
      const browserErrors = []
      page.on('pageerror', error => browserErrors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.locator('#vue-app').waitFor({ state: 'visible', timeout: 30000 })
      if (!(await page.title()).includes('Hyper-Studio')) throw new Error('Branded canvas title did not render')
      try {
        await page.waitForFunction(() => (document.querySelector('#vue-app')?.textContent || '').trim().length > 0, undefined, { timeout: 30000 })
      } catch {
        await page.screenshot({ path: path.join(smoke, 'browser.png'), fullPage: true })
        throw new Error(`Workflow canvas did not render content; browser errors: ${browserErrors.slice(0, 5).join(' | ') || 'none'}`)
      }
      const parent = await browser.newPage()
      const iframeErrors = []
      parent.on('pageerror', error => iframeErrors.push(error.message))
      parent.on('console', message => { if (message.type() === 'error') iframeErrors.push(message.text()) })
      await parent.route(`http://127.0.0.1:${port}/`, async route => {
        const response = await route.fetch()
        const headers = { ...response.headers() }
        delete headers['x-frame-options']
        delete headers['content-security-policy']
        await route.fulfill({ response, headers })
      })
      await parent.setContent(`<iframe id="canvas" src="http://127.0.0.1:${port}/" style="width:100vw;height:90vh"></iframe>`)
      await parent.frameLocator('#canvas').locator('#vue-app').waitFor({ state: 'visible', timeout: 30000 })
      const canvasFrame = parent.frames().find(frame => frame.url().startsWith(`http://127.0.0.1:${port}/`))
      if (!canvasFrame) throw new Error('Canvas iframe did not navigate')
      try {
        await canvasFrame.waitForFunction(() => (document.querySelector('#vue-app')?.textContent || '').trim().length > 0, undefined, { timeout: 30000 })
      } catch {
        await parent.screenshot({ path: path.join(smoke, 'iframe.png'), fullPage: true })
        throw new Error(`Canvas iframe did not render; browser errors: ${iframeErrors.slice(0, 8).join(' | ') || 'none'}`)
      }
      await parent.waitForTimeout(5000)
      const snapshot = await parent.evaluate(async targetOrigin => {
        const frame = document.querySelector('#canvas')
        if (!(frame instanceof HTMLIFrameElement) || !frame.contentWindow) throw new Error('Canvas iframe is missing')
        const target = frame.contentWindow
        return await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Canvas bridge did not return a snapshot')), 10000)
          const onMessage = event => {
            if (event.source !== target || event.origin !== targetOrigin || event.data?.type !== 'hyper-studio:workflow-snapshot') return
            clearTimeout(timeout)
            window.removeEventListener('message', onMessage)
            if (event.data.error) reject(new Error(event.data.error))
            else resolve(event.data.workflow)
          }
          window.addEventListener('message', onMessage)
          target.postMessage({ type: 'hyper-studio:request-workflow', requestId: 'smoke' }, targetOrigin)
        })
      }, `http://127.0.0.1:${port}`)
      if (!snapshot || !Array.isArray(snapshot.nodes)) throw new Error('Canvas bridge returned invalid workflow JSON')
      process.stdout.write(`Canvas bridge snapshot contains ${snapshot.nodes.length} nodes.\n`)
      const reopened = await parent.evaluate(async ({ targetOrigin, workflow }) => {
        const target = document.querySelector('#canvas')?.contentWindow
        if (!target) throw new Error('Canvas iframe is missing')
        target.postMessage({ type: 'hyper-studio:open-workflow', name: 'roundtrip.json', workflow }, targetOrigin)
        await new Promise(resolve => setTimeout(resolve, 2000))
        return await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Canvas bridge did not return reopened workflow')), 10000)
          const onMessage = event => {
            if (event.source !== target || event.origin !== targetOrigin) return
            if (event.data?.type === 'hyper-studio:workflow-error') {
              clearTimeout(timeout)
              window.removeEventListener('message', onMessage)
              reject(new Error(event.data.error))
            }
            if (event.data?.type === 'hyper-studio:workflow-snapshot' && event.data.requestId === 'roundtrip') {
              clearTimeout(timeout)
              window.removeEventListener('message', onMessage)
              if (event.data.error) reject(new Error(event.data.error))
              else resolve(event.data.workflow)
            }
          }
          window.addEventListener('message', onMessage)
          target.postMessage({ type: 'hyper-studio:request-workflow', requestId: 'roundtrip' }, targetOrigin)
        })
      }, { targetOrigin: `http://127.0.0.1:${port}`, workflow: snapshot })
      const ids = nodes => nodes.map(node => String(node.id)).sort().join(',')
      if (!Array.isArray(reopened?.nodes) || ids(reopened.nodes) !== ids(snapshot.nodes)) {
        throw new Error('Workflow node identifiers changed during canvas open/save roundtrip')
      }
    } finally { await browser.close() }
  }
  process.stdout.write('Workflow engine, branded canvas, execution, and shared media index passed.\n')
} finally {
  if (!exited) child.kill()
  fs.closeSync(output)
}

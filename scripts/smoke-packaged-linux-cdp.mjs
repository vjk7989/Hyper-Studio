import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

if (process.platform !== 'linux') throw new Error('This smoke is for packaged Linux only')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executable = process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps/desktop/release/linux-unpacked/hyper-studio')
if (!fs.existsSync(executable)) throw new Error(`Packaged Linux executable is missing: ${executable}`)
const home = path.join(root, '.local-tmp/packaged-electron-smoke/linux')
for (const folder of [home, path.join(home, 'temp'), path.join(home, 'user-data'), path.join(home, 'config'), path.join(home, 'data'), path.join(home, 'state'), path.join(home, 'cache')]) fs.mkdirSync(folder, { recursive: true })
// Give Electron regular files, not Node pipes: a blocked pipe write can stall
// Chromium before its debugging endpoint or app window is created.
const stdoutFd = fs.openSync(path.join(home, 'electron-stdout.log'), 'w')
const stderrFd = fs.openSync(path.join(home, 'electron-stderr.log'), 'w')
const diagnosticFile = path.join(home, 'startup-diagnostics.log')
function command(program, args) {
  try { return execFileSync(program, args, { encoding: 'utf8', timeout: 3000, maxBuffer: 256 * 1024 }).trim() }
  catch (error) { return `${program} failed: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}` }
}
const diagnosticLines = [
  `display=${process.env.DISPLAY || '(unset)'}`,
  `core-pattern=${fs.readFileSync('/proc/sys/kernel/core_pattern', 'utf8').trim()}`,
  `core-pipe-limit=${fs.readFileSync('/proc/sys/kernel/core_pipe_limit', 'utf8').trim()}`,
  `core-suppression=${process.env.HYPER_STUDIO_DIAGNOSTIC_PRELOAD || '(none)'}`,
  `diagnostic-tools=${['strace', 'gdb', 'lldb', 'coredumpctl', 'journalctl'].map(name => `${name}:${command('which', [name])}`).join(' | ')}`,
  `x-socket=${fs.existsSync(`/tmp/.X11-unix/X${(process.env.DISPLAY || '').match(/^:(\d+)/)?.[1] || ''}`)}`,
  `x-authority-file-present=${Boolean(process.env.XAUTHORITY && fs.existsSync(process.env.XAUTHORITY))}`,
  `x-display=${command('xdpyinfo', ['-display', process.env.DISPLAY || '']) .split('\n').slice(0, 6).join(' | ')}`,
  `binary=${executable}`,
  `binary-mode=${fs.statSync(executable).mode.toString(8)}`,
  'launch-flags=--no-sandbox --no-zygote --disable-gpu --disable-dev-shm-usage',
  `missing-libraries=${command('ldd', [executable]).split('\n').filter(line => line.includes('not found')).join(' | ') || '(none)'}`,
]
function pipeDescriptors(pid) {
  try {
    return fs.readdirSync(`/proc/${pid}/fd`).flatMap(fd => {
      try {
        const target = fs.readlinkSync(`/proc/${pid}/fd/${fd}`)
        if (!target.startsWith('pipe:')) return []
        const info = fs.readFileSync(`/proc/${pid}/fdinfo/${fd}`, 'utf8')
        const flags = info.match(/^flags:\s*(\S+)/m)?.[1] || '?'
        return [`${fd}:${target}:${flags}`]
      } catch { return [] }
    }).slice(0, 60).join(' ')
  } catch { return '(unavailable)' }
}
function snapshot(label, pid) {
  const lines = [`stage=${label} time=${new Date().toISOString()} pid=${pid} exited=${JSON.stringify(exit)}`]
  lines.push(`process=${command('ps', ['-o', 'pid,ppid,stat,wchan:32,etime,comm,args', '-p', String(pid)])}`)
  lines.push(`children=${command('ps', ['--ppid', String(pid), '-o', 'pid,ppid,stat,wchan:32,etime,comm,args'])}`)
  lines.push(`coredump-handlers=${command('ps', ['-eo', 'pid,ppid,stat,wchan:32,args']).split('\n').filter(line => line.includes('systemd-coredump') && !line.includes('smoke-packaged-linux-cdp')).slice(0, 8).join(' | ') || '(none)'}`)
  lines.push(`main-pipes=${pipeDescriptors(pid)}`)
  try {
    const syscall = fs.readFileSync(`/proc/${pid}/syscall`, 'utf8').trim()
    lines.push(`main-syscall=${syscall}`)
    const fd = syscall.match(/^1\s+(0x[0-9a-f]+|\d+)/i)?.[1]
    if (fd) {
      const number = String(Number(BigInt(fd)))
      lines.push(`write-fd=${number}:${fs.readlinkSync(`/proc/${pid}/fd/${number}`)}`)
    }
  } catch (error) { lines.push(`main-syscall=(unavailable: ${error instanceof Error ? error.message : String(error)})`) }
  try {
    const children = fs.readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8').trim().split(/\s+/).filter(Boolean)
    for (const childPid of children.slice(0, 8)) lines.push(`child-${childPid}-pipes=${pipeDescriptors(childPid)}`)
  } catch { lines.push('child-pipes=(unavailable)') }
  for (const fd of ['1', '2']) {
    try { lines.push(`fd${fd}=${fs.readlinkSync(`/proc/${pid}/fd/${fd}`)}`) }
    catch { lines.push(`fd${fd}=(unavailable)`) }
  }
  for (const name of ['status', 'wchan']) {
    try {
      const content = fs.readFileSync(`/proc/${pid}/${name}`, 'utf8')
      lines.push(`${name}=${name === 'status' ? content.split('\n').filter(line => /^(Name|State|Threads|VmRSS|CoreDumping|Sig)/.test(line)).join(' | ') : content.trim()}`)
    } catch { lines.push(`${name}=(unavailable)`) }
  }
  try {
    const threads = fs.readdirSync(`/proc/${pid}/task`).slice(0, 24)
    lines.push(`thread-wchan=${threads.map(tid => {
      try { return `${tid}:${fs.readFileSync(`/proc/${pid}/task/${tid}/wchan`, 'utf8').trim()}` }
      catch { return `${tid}:unavailable` }
    }).join(' ')}`)
  } catch { lines.push('thread-wchan=(unavailable)') }
  for (const crashFolder of [path.join(home, 'user-data/Crashpad'), path.join(home, 'user-data/Crash Reports')]) {
    if (!fs.existsSync(crashFolder)) continue
    const reports = fs.readdirSync(crashFolder, { recursive: true }).slice(0, 30)
    lines.push(`crash-reports=${path.relative(home, crashFolder)}:${reports.join(',') || '(empty)'}`)
  }
  diagnosticLines.push(...lines)
  fs.writeFileSync(diagnosticFile, diagnosticLines.join('\n') + '\n')
}
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
  ...(process.env.HYPER_STUDIO_DIAGNOSTIC_PRELOAD ? { LD_PRELOAD: process.env.HYPER_STUDIO_DIAGNOSTIC_PRELOAD } : {}),
  HOME: home,
  USERPROFILE: home,
  TMPDIR: path.join(home, 'temp'), TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'),
  XDG_CONFIG_HOME: path.join(home, 'config'), XDG_DATA_HOME: path.join(home, 'data'),
  XDG_STATE_HOME: path.join(home, 'state'), XDG_CACHE_HOME: path.join(home, 'cache'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
  ELECTRON_ENABLE_LOGGING: '1', ELECTRON_ENABLE_STACK_DUMPING: '1', ELECTRON_LOG_FILE: path.join(home, 'electron.log'),
}
async function probeVersion(binary, label) {
  if (!fs.existsSync(binary)) {
    diagnosticLines.push(`${label}-version-probe=binary missing`)
    fs.writeFileSync(diagnosticFile, diagnosticLines.join('\n') + '\n')
    return
  }
  const output = path.join(home, `${label}-version-probe.log`)
  const fd = fs.openSync(output, 'w')
  const probe = spawn(binary, ['--version', '--no-sandbox'], { cwd: root, env, detached: true, stdio: ['ignore', fd, fd] })
  const result = await new Promise(resolve => {
    const timer = setTimeout(() => resolve('timeout after 5s'), 5000)
    probe.once('exit', (code, signal) => { clearTimeout(timer); resolve(`exit=${code} signal=${signal}`) })
    probe.once('error', error => { clearTimeout(timer); resolve(`error=${error.message}`) })
  })
  if (result.startsWith('timeout')) { probe.kill('SIGTERM'); probe.unref() }
  fs.closeSync(fd)
  diagnosticLines.push(`${label}-version-probe=${result} output=${fs.readFileSync(output, 'utf8').slice(0, 500).replace(/\s+/g, ' ')}`)
  fs.writeFileSync(diagnosticFile, diagnosticLines.join('\n') + '\n')
}
function findCachedElectronZip() {
  const cache = path.join(root, '.local-cache/electron')
  if (!fs.existsSync(cache)) return null
  const entry = fs.readdirSync(cache, { recursive: true }).find(name => String(name).endsWith('electron-v41.0.2-linux-x64.zip'))
  return entry ? path.join(cache, String(entry)) : null
}
async function probeRawElectron() {
  const zip = findCachedElectronZip()
  if (!zip) { diagnosticLines.push('raw-electron-version-probe=cache zip missing'); return }
  const destination = path.join(home, 'raw-electron')
  fs.mkdirSync(destination, { recursive: true })
  try {
    execFileSync('unzip', ['-q', zip, 'electron', '-d', destination], { timeout: 45000, stdio: 'ignore' })
    const raw = path.join(destination, 'electron')
    fs.chmodSync(raw, 0o755)
    diagnosticLines.push(`electron-binary-hashes=${command('sha256sum', [executable, raw]).replace(/\n/g, ' | ')}`)
    await probeVersion(raw, 'raw-electron')
  } catch (error) { diagnosticLines.push(`raw-electron-extract=failed: ${error instanceof Error ? error.message : String(error)}`) }
  fs.writeFileSync(diagnosticFile, diagnosticLines.join('\n') + '\n')
}
async function probeStrace() {
  if (!fs.existsSync('/usr/bin/strace')) return
  const output = path.join(home, 'strace-version-stdout.log')
  const fd = fs.openSync(output, 'w')
  const traceEnv = { ...env }
  delete traceEnv.LD_PRELOAD
  const args = ['-ff', '-tt', '-s', '80', '-e', 'trace=%process,%signal', '-o', path.join(home, 'strace-version')]
  if (env.LD_PRELOAD) args.push('-E', `LD_PRELOAD=${env.LD_PRELOAD}`)
  args.push(executable, '--version', '--no-sandbox')
  const tracer = spawn('/usr/bin/strace', args, { cwd: root, env: traceEnv, detached: true, stdio: ['ignore', fd, fd] })
  const result = await new Promise(resolve => {
    const timer = setTimeout(() => resolve('timeout after 8s'), 8000)
    tracer.once('exit', (code, signal) => { clearTimeout(timer); resolve(`exit=${code} signal=${signal}`) })
    tracer.once('error', error => { clearTimeout(timer); resolve(`error=${error.message}`) })
  })
  if (result.startsWith('timeout')) {
    try { process.kill(-tracer.pid, 'SIGTERM') } catch { /* process exited */ }
    tracer.unref()
  }
  fs.closeSync(fd)
  diagnosticLines.push(`strace-version-probe=${result} output=${fs.readFileSync(output, 'utf8').slice(0, 500).replace(/\s+/g, ' ')}`)
  fs.writeFileSync(diagnosticFile, diagnosticLines.join('\n') + '\n')
}
const child = spawn(executable, [`--remote-debugging-port=${port}`, '--no-sandbox', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'], { cwd: root, env, stdio: ['ignore', stdoutFd, stderrFd] })
let exit = null
child.once('exit', (code, signal) => { exit = { code, signal } })
child.once('error', error => { exit = { error: String(error) } })
const snapshotTimer = setTimeout(() => snapshot('after-10s', child.pid), 10000)
snapshotTimer.unref()
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
  if (!version?.webSocketDebuggerUrl) {
    snapshot('cdp-timeout', child.pid)
    throw new Error(`CDP endpoint did not start; exit=${JSON.stringify(exit)}`)
  }
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
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { window.location.hash = '#/projects' })
  await page.getByText('New Project', { exact: true }).waitFor({ state: 'visible', timeout: 45000 })
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
  if (stage === 'launch') {
    await probeVersion(executable, 'packaged')
    await probeVersion(path.join(root, 'apps/desktop/node_modules/electron/dist/electron'), 'base-electron')
    await probeRawElectron()
    await probeStrace()
    const journal = command('journalctl', ['-k', '--since', '-3 min', '--no-pager', '-n', '80'])
    diagnosticLines.push(`kernel-crash-lines=${journal.split('\n').filter(line => /hyper-studio|electron|segfault|trap|coredump|journalctl failed/i.test(line)).slice(-20).join(' | ') || '(none)'}`)
    fs.writeFileSync(diagnosticFile, diagnosticLines.join('\n') + '\n')
  }
  if (page) await page.screenshot({ path: path.join(home, `failure-${stage}.png`) }).catch(() => {})
  console.error(`Linux packaged smoke failed at ${stage}: ${error instanceof Error ? error.message : String(error)}`)
  const tail = fs.existsSync(path.join(home, 'electron-stderr.log')) ? fs.readFileSync(path.join(home, 'electron-stderr.log'), 'utf8').slice(-2000) : ''
  if (tail) console.error(`Electron stderr tail: ${tail}`)
  throw error
} finally {
  clearTimeout(snapshotTimer)
  if (browser) await browser.close().catch(() => {})
  if (!child.killed && exit === null) child.kill('SIGTERM')
  await new Promise(resolve => setTimeout(resolve, 500))
  if (exit === null) child.kill('SIGKILL')
  fs.closeSync(stdoutFd); fs.closeSync(stderrFd)
}

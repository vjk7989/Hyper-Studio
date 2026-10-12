import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const home = path.join(root, '.local-tmp', `workflow-run-isolation-${Date.now()}`)
const shared = path.join(root, '.local-tmp', 'packaged-electron-smoke-project-controls', 'shared-storage')
const executablePath = path.resolve(process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe'))
if (!executablePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(executablePath)) throw new Error('Smoke executable must be an existing repository-local file')
const source = path.join(home, 'linked-local.json')
for (const folder of [home, path.join(home, 'appdata'), path.join(home, 'localappdata'), path.join(home, 'temp')]) fs.mkdirSync(folder, { recursive: true })
fs.writeFileSync(source, JSON.stringify({
  last_node_id:2, last_link_id:1, nodes:[
    { id:1, type:'EmptyImage', pos:[100,150], size:[270,130], flags:{}, order:0, mode:0, inputs:[], outputs:[{name:'IMAGE',type:'IMAGE',links:[1]}], properties:{'Node name for S&R':'EmptyImage'}, widgets_values:[64,64,1,0] },
    { id:2, type:'SaveImage', pos:[500,150], size:[270,58], flags:{}, order:1, mode:0, inputs:[{name:'images',type:'IMAGE',link:1}], outputs:[], properties:{'Node name for S&R':'SaveImage'}, widgets_values:['workflow-control-ui'] },
  ], links:[[1,1,0,2,0,'IMAGE']], groups:[], config:{}, extra:{ds:{scale:1,offset:[0,0]}}, version:0.4,
}))
const env = { ...process.env, HOME:home, USERPROFILE:home, APPDATA:path.join(home,'appdata'), LOCALAPPDATA:path.join(home,'localappdata'), TEMP:path.join(home,'temp'), TMP:path.join(home,'temp'), TMPDIR:path.join(home,'temp'), HYPER_STUDIO_USER_DATA:path.join(home,'user-data') }
const app = await electron.launch({ executablePath, cwd:root, env, args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'], timeout:120000 })
const log = (...v) => process.stdout.write(`${v.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')}\n`)
log('HOME', home)
try {
  const window = await app.firstWindow({ timeout:45000 })
  // Standalone Playwright has no action timeout by default. A covered canvas
  // control must fail with evidence instead of holding the CI job indefinitely.
  window.setDefaultTimeout(15000)
  await window.waitForLoadState('domcontentloaded')
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({folder}), shared)
  await window.evaluate(() => window.electronAPI.setConnectionOnboardingSkipped?.({ skipped: true }))
  await window.reload({waitUntil:'domcontentloaded'})
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.getByTestId('new-project-card').waitFor({state:'visible',timeout:30000})
  const projectFolder = path.join(home,'project'); fs.mkdirSync(projectFolder,{recursive:true})
  await app.evaluate(({dialog},folder)=>{ dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]}) },projectFolder)
  await window.getByTestId('new-project-card').click()
  await window.getByPlaceholder('Project name').fill('Run isolation')
  await window.getByText('Workflow mode',{exact:true}).click()
  await window.getByText('Choose a folder',{exact:true}).click()
  await window.getByRole('button',{name:'Create',exact:true}).click()
  const canvas = window.frameLocator('iframe[title="Hyper-Studio workflow canvas"]')
  await canvas.locator('#graph-canvas').waitFor({state:'visible',timeout:60000})
  await canvas.locator('#graph-canvas').evaluate(() => new Promise((resolve, reject) => {
    const started = Date.now()
    const poll = () => {
      if (window.app?.graph && window.app?.canvas?.graph) resolve()
      else if (Date.now() - started > 30000) reject(new Error('Workflow graph did not initialize'))
      else setTimeout(poll, 100)
    }
    poll()
  }))
  const engine=await window.evaluate(()=>window.electronAPI.getWorkflowEngineStatus())
  const snapshot=async()=>window.evaluate(async origin=>{
    const target=document.querySelector('iframe[title="Hyper-Studio workflow canvas"]')?.contentWindow
    return await new Promise((resolve,reject)=>{
      const requestId=crypto.randomUUID(), timer=setTimeout(()=>reject(new Error('snapshot timeout')),10000)
      const listener=e=>{ if(e.source!==target||e.origin!==origin||e.data?.type!=='hyper-studio:workflow-snapshot'||e.data.requestId!==requestId)return;clearTimeout(timer);window.removeEventListener('message',listener);e.data.error?reject(new Error(e.data.error)):resolve(e.data.workflow) }
      window.addEventListener('message',listener);target.postMessage({type:'hyper-studio:request-workflow',requestId},origin)
    })
  },new URL(engine.url).origin)
  await app.evaluate(({dialog},file)=>{ dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]}) },source)
  await window.getByRole('button',{name:'Import',exact:true}).click()
  let imported
  for (let i=0;i<60;i++) {
    imported=await snapshot()
    if (imported.nodes?.length===2) break
    await window.waitForTimeout(250)
  }
  if (imported.nodes?.length !== 2) {
    log('IMPORT DIAGNOSTIC', {
      openEnabled: await window.getByRole('button',{name:'Open',exact:true}).isEnabled(),
      alert: await window.locator('[role="alert"]').allInnerTexts(),
      graphNodeIds: await canvas.locator('#graph-canvas').evaluate(() => window.app?.graph?._nodes?.map(node => node.id) ?? null),
    })
  }
  assert.deepEqual(imported.nodes.map(node=>node.id),[1,2], 'Imported workflow must retain node IDs')
  assert.equal(imported.links.length,1,'Imported workflow must retain its graph link')
  await canvas.getByTestId('queue-button').click()
  let outputs=[]
  for (let i=0;i<120;i++) {
    outputs=fs.existsSync(path.join(projectFolder,'outputs'))?fs.readdirSync(path.join(projectFolder,'outputs')):[]
    if (outputs.some(name=>/^workflow-control-ui_.*\.png$/.test(name))) break
    await window.waitForTimeout(250)
  }
  assert.ok(outputs.some(name=>/^workflow-control-ui_.*\.png$/.test(name)), 'Linked local workflow must produce a PNG')
  if((await canvas.locator('body').innerText()).includes('Required input missing')) throw new Error('Successful linked workflow still shows a required-input warning')
  log('PASS linked local execution generated PNG',outputs.find(name=>name.startsWith('workflow-control-ui_')))
  log('STEP graph menu open')
  await canvas.getByRole('button',{name:'Graph mode, workflow actions'}).click()
  log('STEP graph menu opened')
  await canvas.getByRole('menu').waitFor({state:'visible',timeout:10000})
  await canvas.locator('body').press('Escape')
  await canvas.getByRole('menu').waitFor({state:'hidden',timeout:10000})
  log('STEP graph menu dismissed')
  // The tab strip overlaps the canvas origin and a post-run loading overlay
  // can briefly intercept pointer input. Wait for loading, then focus the
  // keyboard target directly so the shortcut is still exercised.
  try { await canvas.getByTestId('app-loading-overlay').waitFor({state:'hidden',timeout:30000}) }
  catch(error) {
    log('CANVAS READINESS DIAGNOSTIC',{
      loadingOverlay:await canvas.getByTestId('app-loading-overlay').count(),
      graphPresent:await canvas.locator('#graph-canvas').count(),
      bodyText:(await canvas.locator('body').innerText().catch(()=>'')).slice(0,1000),
    })
    throw error
  }
  log('STEP canvas overlay hidden')
  await canvas.locator('#graph-canvas').focus()
  assert.equal(await canvas.locator('#graph-canvas').evaluate(element=>document.activeElement===element),true,'Workflow canvas must accept keyboard focus')
  const settingsBrowserErrors=[]
  window.on('pageerror',error=>settingsBrowserErrors.push(`pageerror: ${error.message}`))
  window.on('console',message=>{if(message.type()==='error') settingsBrowserErrors.push(`console: ${message.text()}`)})
  log('STEP settings shortcut')
  await canvas.locator('#graph-canvas').press('Control+,')
  const settings=canvas.getByTestId('settings-dialog')
  try {
    await settings.waitFor({state:'visible',timeout:15000})
    log('STEP settings opened')
  } catch(error) {
    const evidence={
      activeElement:await canvas.locator('body').evaluate(() => document.activeElement?.outerHTML.slice(0,500)).catch(() => null),
      menuCount:await canvas.getByRole('menu').count(),
      iframeUrl:await canvas.locator('body').evaluate(() => location.href).catch(() => null),
      bodyText:(await canvas.locator('body').innerText().catch(() => '')).slice(0,1000),
      browserErrors:settingsBrowserErrors.slice(-12),
    }
    fs.writeFileSync(path.join(home,'settings-open-failure.json'),JSON.stringify(evidence,null,2))
    await window.screenshot({path:path.join(home,'settings-open-failure.png')}).catch(()=>{})
    log('SETTINGS OPEN DIAGNOSTIC',evidence)
    throw error
  }
  // The embedded canvas can cross the responsive breakpoint as the dialog
  // settles. Check the actual navigation control immediately before clicking.
  const showSettingsNav=settings.getByRole('button',{name:'Show left panel'})
  if(await showSettingsNav.isVisible()) await showSettingsNav.click()
  const extensionNav=settings.locator('[data-nav-id="extension"]')
  await extensionNav.waitFor({state:'visible'})
  await extensionNav.focus()
  assert.equal(await extensionNav.evaluate(element=>document.activeElement===element),true,'Settings navigation must be keyboard focusable')
  // Vue ignores events dispatched in the same task that attached its listener.
  // Use a bounded host-side wait because animation frames can pause in CI.
  await window.waitForTimeout(75)
  await settings.waitFor({state:'visible',timeout:5000})
  log('STEP extension navigation Enter')
  await extensionNav.press('Enter')
  try {
    await settings.waitFor({state:'visible',timeout:5000})
    await settings.locator('.extension-panel').waitFor({state:'visible',timeout:10000})
    log('STEP extension panel visible')
  } catch(error) {
    const evidence={
      iframeCount:await window.locator('iframe[title="Hyper-Studio workflow canvas"]').count(),
      iframeUrl:await canvas.locator('body').evaluate(() => location.href).catch(() => null),
      settingsCount:await settings.count(),
      bodyText:(await canvas.locator('body').innerText().catch(() => '')).slice(0,1000),
      browserErrors:settingsBrowserErrors.slice(-12),
    }
    fs.writeFileSync(path.join(home,'settings-failure.json'),JSON.stringify(evidence,null,2))
    await window.screenshot({path:path.join(home,'settings-failure.png')}).catch(()=>{})
    log('SETTINGS DIAGNOSTIC',evidence)
    throw error
  }
  assert.ok((await settings.innerText()).includes('Extension'),'Extension settings must render')
  await canvas.locator('body').press('Escape')
  const missing=JSON.parse(fs.readFileSync(source,'utf8'))
  missing.nodes.push({id:99,type:'WorkflowSmokeMissingNode',pos:[420,450],size:[260,80],flags:{},order:2,mode:0,inputs:[],outputs:[],properties:{cnr_id:'workflow-control-missing-pack'},widgets_values:[]})
  missing.last_node_id=99
  const missingSource=path.join(home,'missing-node.json');fs.writeFileSync(missingSource,JSON.stringify(missing))
  await app.evaluate(({dialog},file)=>{ dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]}) },missingSource)
  await window.getByRole('button',{name:'Import',exact:true}).click()
  const importedMissing=path.join(projectFolder,'workflows','missing-node.json')
  for (let i=0;i<60 && !fs.existsSync(importedMissing);i++) await window.waitForTimeout(250)
  assert.ok(fs.existsSync(importedMissing),'Missing-node workflow must be copied into the project')
  assert.deepEqual(JSON.parse(fs.readFileSync(importedMissing,'utf8')).nodes.map(node=>node.id),[1,2,99],'Missing third-party node and original IDs must survive import')
  await canvas.getByRole('button',{name:'Toggle properties panel'}).click()
  await canvas.getByTestId('panel-tab-errors').click()
  const missingErrors=await canvas.locator('body').innerText()
  assert.match(missingErrors,/WorkflowSmokeMissingNode|missing node|missing custom node/i,'Missing-node guidance must be visible')
  log('PASS missing-node JSON and guidance')
} finally {
  log('STEP shutdown begin')
  // A dirty imported graph can raise beforeunload while Electron is closing.
  // Handle that dialog explicitly: Playwright's automatic dismissal can race
  // the destroyed frame and reject with "No dialog is showing" after every
  // assertion has already passed.
  const shutdownDialogs=[]
  const dialogHandlers=[]
  const unexpectedDialogErrors=[]
  for(const page of app.windows()) page.on('dialog',dialog=>{
    shutdownDialogs.push(dialog.type())
    dialogHandlers.push(dialog.accept().catch(error=>{
      if(!/No dialog is showing|Target (page|browser|context) has been closed/i.test(String(error))) unexpectedDialogErrors.push(error)
    }))
  })
  const shutdownWatchdog=setTimeout(()=>{
    log('FAIL shutdown exceeded 30 seconds', {pid:app.process()?.pid, home})
    app.process()?.kill()
    process.exit(1)
  },30000)
  try {
    await app.close()
    log('STEP shutdown complete')
  }
  finally {
    clearTimeout(shutdownWatchdog)
    await Promise.all(dialogHandlers)
    if(shutdownDialogs.length) log('SHUTDOWN DIALOGS',shutdownDialogs)
    if(unexpectedDialogErrors.length) throw unexpectedDialogErrors[0]
  }
}

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const home = path.join(root, '.local-tmp', `workflow-run-isolation-${Date.now()}`)
const shared = path.join(root, '.local-tmp', 'packaged-electron-smoke-project-controls', 'shared-storage')
const executablePath = path.resolve(process.env.HYPER_STUDIO_SMOKE_EXE || path.join(root, '.local-tmp', 'installed-project-controls-final', 'Hyper-Studio.exe'))
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
  await window.waitForLoadState('domcontentloaded')
  await window.evaluate(folder => window.electronAPI.setSharedStorageRoot({folder}), shared)
  await window.reload({waitUntil:'domcontentloaded'})
  await window.evaluate(() => { window.location.hash = '#/projects' })
  await window.getByTestId('new-project-card').waitFor({state:'visible',timeout:30000})
  const projectFolder = path.join(home,'project'); fs.mkdirSync(projectFolder,{recursive:true})
  await app.evaluate(({dialog},folder)=>{ dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]}) },projectFolder)
  await window.getByTestId('new-project-card').click()
  await window.getByPlaceholder('Project name').fill('Run isolation')
  await window.getByText('Workflow mode',{exact:true}).click()
  await window.getByText('Choose a folder',{exact:true}).click()
  await window.getByPlaceholder('Project name').press('Enter')
  const canvas = window.frameLocator('iframe[title="Hyper-Studio workflow canvas"]')
  await canvas.locator('#graph-canvas').waitFor({state:'visible',timeout:60000})
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
  await window.waitForTimeout(1500)
  log('TABS',await canvas.getByTestId('workflow-tab').evaluateAll(els=>els.map(e=>({text:e.textContent?.trim(),state:e.getAttribute('data-state'),path:e.getAttribute('data-workflow-path')}))))
  log('SNAPSHOT',await snapshot())
  await window.screenshot({path:path.join(home,'before-run.png')})
  await canvas.getByTestId('queue-button').click()
  await window.waitForTimeout(2500)
  log('BODY AFTER RUN',(await canvas.locator('body').innerText()).slice(-1800))
  const outputs=fs.existsSync(path.join(projectFolder,'outputs'))?fs.readdirSync(path.join(projectFolder,'outputs')):[]
  log('OUTPUTS',outputs)
  await window.screenshot({path:path.join(home,'after-run.png')})
  log('MANAGER BUTTONS',await canvas.locator('button').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width).map(e=>({text:e.textContent?.trim(),aria:e.getAttribute('aria-label')})).filter(x=>/manager|extension|install|update|uninstall/i.test(`${x.text} ${x.aria}`))))
  await canvas.getByRole('button',{name:'Graph mode, workflow actions'}).click()
  log('GRAPH MENU',(await canvas.locator('body').innerText()).slice(-1200))
  await window.screenshot({path:path.join(home,'graph-menu.png')})
  await canvas.locator('body').press('Escape')
  await canvas.locator('#graph-canvas').press('Control+,')
  const settings=canvas.getByTestId('settings-dialog')
  await settings.waitFor({state:'visible',timeout:10000})
  await settings.locator('[data-nav-id="extension"]').click()
  log('EXTENSION SETTINGS',(await settings.innerText()).slice(0,1600))
  await window.screenshot({path:path.join(home,'extension-settings.png')})
  await canvas.locator('body').press('Escape')
  const missing=JSON.parse(fs.readFileSync(source,'utf8'))
  missing.nodes.push({id:99,type:'WorkflowSmokeMissingNode',pos:[420,450],size:[260,80],flags:{},order:2,mode:0,inputs:[],outputs:[],properties:{cnr_id:'workflow-control-missing-pack'},widgets_values:[]})
  missing.last_node_id=99
  const missingSource=path.join(home,'missing-node.json');fs.writeFileSync(missingSource,JSON.stringify(missing))
  await app.evaluate(({dialog},file)=>{ dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]}) },missingSource)
  await window.getByRole('button',{name:'Import',exact:true}).click()
  await window.waitForTimeout(1500)
  log('MISSING SNAPSHOT',await snapshot())
  log('MISSING BODY',(await canvas.locator('body').innerText()).slice(-1300))
  await canvas.getByRole('button',{name:'Toggle properties panel'}).click()
  await canvas.getByTestId('panel-tab-errors').click()
  log('MISSING ERRORS',(await canvas.locator('body').innerText()).slice(-1600))
  await window.screenshot({path:path.join(home,'missing-node.png')})
} finally { await app.close() }

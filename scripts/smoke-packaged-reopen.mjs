import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../apps/workflow-ui/node_modules/@playwright/test/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const home = path.join(root, '.local-tmp', 'packaged-electron-smoke')
const executablePath = path.join(root, 'apps', 'desktop', 'release', 'win-unpacked', 'Hyper-Studio.exe')
const projects = fs.readdirSync(home, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name.startsWith('workflow-project-'))
  .map(entry => path.join(home, entry.name))
  .sort((a, b) => Number(path.basename(b).split('-').at(-1)) - Number(path.basename(a).split('-').at(-1)))
const folder = projects[0]
if (!folder || !fs.existsSync(path.join(folder, '.hyper-studio'))) throw new Error('Run packaged Electron smoke before reopen smoke')
const env = {
  ...process.env,
  HOME: home, USERPROFILE: home,
  APPDATA: path.join(home, 'appdata'), LOCALAPPDATA: path.join(home, 'localappdata'),
  TEMP: path.join(home, 'temp'), TMP: path.join(home, 'temp'), TMPDIR: path.join(home, 'temp'),
  HYPER_STUDIO_USER_DATA: path.join(home, 'user-data'),
}
const app = await electron.launch({ executablePath, cwd: root, env, args: ['--no-sandbox'], timeout: 45000 })
try {
  const window = await app.firstWindow({ timeout: 45000 })
  await window.waitForLoadState('domcontentloaded', { timeout: 45000 })
  const project = await window.evaluate(projectFolder => window.electronAPI.openWorkspaceProject({ folder: projectFolder }), folder)
  if (project.mode !== 'workflow') throw new Error(`Reopened project lost Workflow mode: ${project.mode}`)
  const workflow = await window.evaluate(projectId => window.electronAPI.openProjectWorkflow({ projectId, name: 'roundtrip.json' }), project.projectId)
  const imported = fs.readFileSync(path.join(folder, 'workflows', 'roundtrip.json'), 'utf8')
  if (workflow.contents !== imported) throw new Error('Reopened workflow JSON changed after restart')
  const media = await window.evaluate(projectId => window.electronAPI.listWorkspaceMedia({ projectId }), project.projectId)
  for (const name of ['editor-import.png', 'hyper-studio-package_00001_.png', 'hyper-studio-editor-input_00001_.png']) {
    if (!media.some(item => item.relativePath.endsWith(name))) throw new Error(`Reopened media index is missing ${name}`)
  }
  const engine = await window.evaluate(projectId => window.electronAPI.startWorkflowEngine({ projectId }), project.projectId)
  if (engine.state !== 'running' || !engine.url) throw new Error(`Reopened workflow engine failed: ${JSON.stringify(engine)}`)
  const response = await fetch(new URL('object_info/LoadImage', engine.url))
  if (!response.ok) throw new Error(`Reopened workflow engine did not serve nodes: ${response.status}`)
  process.stdout.write(`Packaged project reopen passed: ${project.projectId}; ${media.length} media entries; workflow bytes retained\n`)
} finally {
  await app.close()
}

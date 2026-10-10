import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { resolveProjectPath } from './project-workspace.ts'

const MAX_WORKFLOW_BYTES = 20 * 1024 * 1024
const MAX_WORKFLOW_NAME_LENGTH = 128

function workflowName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > MAX_WORKFLOW_NAME_LENGTH || !trimmed.toLowerCase().endsWith('.json') ||
      /[\\/<>:"|?*\x00-\x1f]/.test(trimmed) || trimmed === '.' || trimmed === '..' ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(trimmed)) {
    throw new Error('Invalid workflow filename')
  }
  return trimmed
}

function workflowPath(projectFolder: string, name: string): string {
  return resolveProjectPath(projectFolder, `workflows/${workflowName(name)}`)
}

function collisionName(parsed: path.ParsedPath, suffix: number): string {
  // A suffixed name is longer than the original, so trim the stem to stay inside the name cap.
  const tail = ` (${suffix})${parsed.ext}`
  const stem = parsed.name.slice(0, Math.max(1, MAX_WORKFLOW_NAME_LENGTH - tail.length)).replace(/[ .]+$/, '')
  return workflowName(`${stem}${tail}`)
}

function validatedJson(contents: string): string {
  if (Buffer.byteLength(contents) > MAX_WORKFLOW_BYTES) throw new Error('Workflow JSON exceeds 20 MB')
  const parsed: unknown = JSON.parse(contents)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Workflow JSON must be an object')
  return contents
}

function readWorkflowJson(file: string): string {
  if (fs.statSync(file).size > MAX_WORKFLOW_BYTES) throw new Error('Workflow JSON exceeds 20 MB')
  return validatedJson(fs.readFileSync(file, 'utf8'))
}

export function listProjectWorkflows(projectFolder: string): string[] {
  const folder = resolveProjectPath(projectFolder, 'workflows')
  return fs.readdirSync(folder, { withFileTypes: true })
    .filter(item => item.isFile() && item.name.toLowerCase().endsWith('.json'))
    .map(item => item.name).sort((a, b) => a.localeCompare(b))
}

export function openProjectWorkflow(projectFolder: string, name: string): string {
  return readWorkflowJson(workflowPath(projectFolder, name))
}

export function saveProjectWorkflow(projectFolder: string, name: string, contents: string): string {
  const destination = workflowPath(projectFolder, name)
  const original = validatedJson(contents)
  const temporary = `${destination}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temporary, original, { flag: 'wx', mode: 0o600 })
    fs.renameSync(temporary, destination)
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) }
  return workflowName(name)
}

export function importProjectWorkflow(projectFolder: string, sourcePath: string): string {
  if (!path.isAbsolute(sourcePath)) throw new Error('Workflow source must be absolute')
  const source = fs.realpathSync(sourcePath)
  if (!fs.statSync(source).isFile()) throw new Error('Workflow source must be a file')
  const raw = readWorkflowJson(source)
  const parsed = path.parse(source)
  let name = workflowName(parsed.base)
  for (let suffix = 1; fs.existsSync(workflowPath(projectFolder, name)); suffix++) {
    name = collisionName(parsed, suffix)
  }
  return saveProjectWorkflow(projectFolder, name, raw)
}

export function exportProjectWorkflow(projectFolder: string, name: string, destinationPath: string): void {
  if (!path.isAbsolute(destinationPath)) throw new Error('Workflow destination must be absolute')
  const source = workflowPath(projectFolder, name)
  const contents = readWorkflowJson(source)
  // Stage beside the destination and rename so a failure never truncates it and a
  // destination symlink is replaced instead of being written through.
  const destination = path.resolve(destinationPath)
  const temporary = `${destination}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temporary, contents, { flag: 'wx', mode: 0o600 })
    fs.renameSync(temporary, destination)
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) }
}

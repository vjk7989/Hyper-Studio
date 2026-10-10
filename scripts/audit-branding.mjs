import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, '.local-cache', 'brand-audit', 'audit.json')
const sourceRoots = [
  'apps/desktop/frontend/', 'apps/desktop/electron/', 'apps/desktop/public/',
  'apps/desktop/resources/', 'apps/desktop/electron-builder.yml',
  'apps/workflow-ui/src/', 'apps/workflow-ui/public/',
  'services/workflow/main.py', 'services/workflow/nodes.py',
  'services/workflow/app/database/db.py',
]
const builtRoots = [
  'apps/workflow-ui/dist',
  'apps/desktop/release/win-unpacked/resources/workflow-frontend',
  'apps/desktop/release/win-unpacked/resources/dist-remote',
  'apps/desktop/release/mac-arm64/Hyper-Studio.app/Contents/Resources/workflow-frontend',
  'apps/desktop/release/mac-arm64/Hyper-Studio.app/Contents/Resources/dist-remote',
  'apps/desktop/release/linux-unpacked/resources/workflow-frontend',
  'apps/desktop/release/linux-unpacked/resources/dist-remote',
]
const textExt = new Set(['.ts', '.tsx', '.js', '.mjs', '.vue', '.json', '.css', '.scss', '.html', '.svg', '.py', '.yml', '.yaml', '.txt'])
const visualExt = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.icns', '.mp4', '.webm', '.mov'])
const patterns = [
  ['old-product-name', /\b(?:LTX Desktop|LTX Studio|ComfyUI|Lightricks)\b/gi],
  ['upstream-destination', /https?:\/\/(?:[\w.-]*\.)?(?:comfy\.org|ltx\.io|ltx\.studio)(?:\/[^\s"'`)]*)?|https?:\/\/github\.com\/(?:Comfy-Org|Lightricks\/LTX-Desktop)(?:\/[^\s"'`)]*)?/gi],
]
// These exceptions are limited to exact source areas and purposes. All other
// occurrences remain review findings; a renamed file does not inherit an allow.
const allowlist = [
  {
    id: 'provider-model-catalog',
    path: /^apps\/desktop\/frontend\/lib\/(?:ic-lora-recipes|lora-recipes)\.ts$/,
    line: /huggingface\.co\/Lightricks\/LTX-|github\.com\/Lightricks\/LTX-2\/blob\/main\/LICENSE/,
    reason: 'LTX model names, source repositories, and model licenses are provider facts.',
  },
  {
    id: 'model-license-fetch',
    path: /^apps\/desktop\/electron\/ipc\/app-handlers\.ts$/,
    line: /huggingface\.co\/Lightricks\/LTX-2\.3\/raw\/main\/LICENSE/,
    reason: 'The selected LTX model license is fetched from its publisher.',
  },
  {
    id: 'legal-attribution',
    path: /^apps\/desktop\/frontend\/(?:lib\/legal-links\.ts|components\/settings\/AboutSettingsSection\.tsx)$/,
    line: /LICENSE|licensed under|attribution/i,
    reason: 'About/legal attribution must retain upstream names and license links.',
  },
  {
    id: 'workflow-legal-attribution',
    path: /^apps\/workflow-ui\/src\/components\/dialog\/content\/setting\/AboutPanel\.vue$/,
    line: /Workflow engine and canvas are based on ComfyUI|github\.com\/Comfy-Org\/ComfyUI_frontend/,
    reason: 'The embedded About legal notice identifies the upstream engine and pinned canvas source.',
  },
  {
    id: 'ltx-provider-endpoint',
    path: /^apps\/desktop\/electron\/provider-jobs\/adapters\.ts$/,
    line: /https:\/\/api\.ltx\.io/,
    reason: 'The LTX adapter must call its named provider endpoint.',
  },
  {
    id: 'workflow-compatibility-schema',
    path: /^apps\/workflow-ui\/src\/(?:workbench\/extensions\/manager\/types\/generatedManagerTypes\.ts|types\/|constants\/)/,
    line: /ComfyUI|comfyui|Comfy\./,
    reason: 'Generated API schemas, node identifiers, and setting/command IDs preserve workflow compatibility.',
  },
  {
    id: 'workflow-manager-package',
    path: /^services\/workflow\/main\.py$/,
    line: /comfyui-manager|comfyui_manager|comfyui_version/,
    reason: 'Manager package and module names are technical dependencies.',
  },
  {
    id: 'workflow-database-path',
    path: /^services\/workflow\/app\/database\/db\.py$/,
    line: /comfyui\.db/,
    reason: 'Existing database filename is retained for migration compatibility.',
  },
  {
    id: 'workflow-node-path-examples',
    path: /^services\/workflow\/nodes\.py$/,
    line: /get_module_name\("C:\/Users\/username\/ComfyUI\/|built-in extra nodes in ComfyUI|imports them into ComfyUI/,
    reason: 'Developer examples and docstrings are not node titles or user-facing descriptions.',
  },
  {
    id: 'legacy-link-fallback',
    path: /^apps\/workflow-ui\/src\/(?:composables\/useExternalLink|platform\/support\/config)\.ts$/,
    line: /isHyperStudioEmbedded|docs\.comfy\.org|support\.comfy\.org|forum\.comfy\.org|comfy\.org/,
    reason: 'Source fallback for non-embedded upstream build; built Hyper-Studio assets must still be checked.',
  },
]
const matches = []
const visuals = []

function relative(file) { return path.relative(root, file).replaceAll('\\', '/') }
function withinScope(file) { return sourceRoots.some(prefix => file === prefix || file.startsWith(prefix)) }
function isTestOrFixture(file) { return /(?:\.test\.|\.spec\.|\.stories\.|\/__fixtures__\/|\/test\/|\/tests\/)/.test(file) }
function classify(file, line) {
  const match = allowlist.find(rule => rule.path.test(file) && rule.line.test(line))
  return match ? { allowed: match.id, reason: match.reason } : { allowed: null }
}
function scanSource(file) {
  const absolute = path.join(root, file)
  if (!fs.existsSync(absolute)) return
  if (visualExt.has(path.extname(file).toLowerCase())) {
    visuals.push({ file, bytes: fs.statSync(absolute).size, legacyName: /(?:comfy[-_](?:logo|icon|cloud)|ltx[-_](?:logo|studio[-_]logo))/i.test(file), cloudPromo: /cloud-subscription\.webm$/i.test(file) })
  }
  if (!textExt.has(path.extname(file).toLowerCase())) return
  const content = fs.readFileSync(absolute, 'utf8')
  const scanLine = (line, lineNumber, key) => {
    for (const [kind, pattern] of patterns) {
      pattern.lastIndex = 0
      for (const hit of line.matchAll(pattern)) {
        matches.push({ file, line: lineNumber, key, kind, match: hit[0], ...classify(file, line) })
      }
    }
  }
  if (/^apps\/workflow-ui\/src\/locales\/[^/]+\/.*\.json$/.test(file)) {
    const visit = (value, key = '') => {
      if (typeof value === 'string') scanLine(value, null, key)
      else if (Array.isArray(value)) value.forEach((child, index) => visit(child, `${key}[${index}]`))
      else if (value && typeof value === 'object') Object.entries(value).forEach(([name, child]) => visit(child, key ? `${key}.${name}` : name))
    }
    visit(JSON.parse(content))
    return
  }
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*(?:\/\/|\*|#|import\s|from\s)/.test(line)) continue
    scanLine(line, i + 1, null)
  }
}
function walk(folder, callback) {
  if (!fs.existsSync(folder)) return
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name)
    if (entry.isDirectory()) walk(full, callback)
    else if (entry.isFile()) callback(full)
  }
}

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'buffer' })
  .toString('utf8').split('\0').filter(Boolean).map(file => file.replaceAll('\\', '/'))
const sourceFiles = tracked.filter(withinScope).filter(file => !isTestOrFixture(file))
for (const file of sourceFiles) scanSource(file)
const built = []
for (const folder of builtRoots) {
  const absolute = path.join(root, folder)
  const files = []
  walk(absolute, full => {
    const file = relative(full)
    const ext = path.extname(full).toLowerCase()
    if (visualExt.has(ext)) files.push({ file, kind: 'visual', bytes: fs.statSync(full).size, legacyName: /(?:comfy[-_](?:logo|icon|cloud)|ltx[-_](?:logo|studio[-_]logo))/i.test(file), cloudPromo: /cloud-subscription\.webm$/i.test(file) })
    if (!textExt.has(ext)) return
    const content = fs.readFileSync(full, 'utf8')
    for (const [kind, pattern] of patterns) {
      pattern.lastIndex = 0
      const hits = [...content.matchAll(pattern)]
      if (hits.length) files.push({ file, kind, count: hits.length, examples: [...new Set(hits.slice(0, 5).map(hit => hit[0]))] })
    }
  })
  built.push({ folder, present: fs.existsSync(absolute), builtAt: fs.existsSync(absolute) ? fs.statSync(absolute).mtime.toISOString() : null, files })
}
const result = {
  generatedAt: new Date().toISOString(),
  allowlist: allowlist.map(({ id, path, line, reason }) => ({ id, path: path.source, line: line.source, reason })),
  trackedSourceFiles: sourceFiles.length,
  matches,
  visuals,
  built,
  summary: {
    sourceMatches: matches.length,
    unallowedMatches: matches.filter(hit => !hit.allowed).length,
    trackedVisuals: visuals.length,
    residualVisualNames: visuals.filter(asset => asset.legacyName).length,
    builtTrees: built.filter(tree => tree.present).length,
    builtResidualVisualNames: built.flatMap(tree => tree.files).filter(file => file.legacyName).length,
  },
}
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ output: relative(output), summary: result.summary }))

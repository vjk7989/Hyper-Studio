// CI diagnostic only: mark early bundled-main startup without changing source.
import fs from 'node:fs'
import path from 'node:path'

const entry = path.resolve(process.argv[2] || 'apps/desktop/dist-electron/main.js')
let source = fs.readFileSync(entry, 'utf8')
if (source.includes('__hyperStudioBootWrite')) throw new Error('Entry already has boot markers')

function insertAroundLine(label, pattern) {
  const match = pattern.exec(source)
  if (!match) throw new Error(`Could not find ${label} in bundled Electron entry`)
  const start = source.lastIndexOf('\n', match.index) + 1
  const end = source.indexOf('\n', match.index)
  if (end < 0) throw new Error(`Could not find end of ${label} line`)
  const before = `__hyperStudioBootWrite(2, 'HSBOOT before ${label}\\n');\n`
  const after = `\n__hyperStudioBootWrite(2, 'HSBOOT after ${label}\\n');`
  source = source.slice(0, start) + before + source.slice(start, end) + after + source.slice(end)
}

insertAroundLine('single-instance-lock', /\.requestSingleInstanceLock\(\)/)
insertAroundLine('user-data-path', /\.setPath\("userData"/)
const firstStatement = source.search(/^(?!import\b)\S/m)
if (firstStatement < 0) throw new Error('Could not locate first bundled statement')
source = source.slice(0, firstStatement) + "__hyperStudioBootWrite(2, 'HSBOOT entry\\n');\n" + source.slice(firstStatement)
source = "import { writeSync as __hyperStudioBootWrite } from 'node:fs';\n" + source
fs.writeFileSync(entry, source)
console.log(`Added Linux CI boot markers to ${entry}`)

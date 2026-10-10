import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repo = resolve(desktop, '..', '..')
const iconSvg = readFileSync(resolve(desktop, 'resources/icon_source.svg'), 'utf8')
const darkSvg = readFileSync(resolve(repo, 'assets/brand/hyper-studio-mark-dark.svg'), 'utf8')
const lightSvg = readFileSync(resolve(repo, 'assets/brand/hyper-studio-mark-light.svg'), 'utf8')

function png(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
}

function write(relativePath, bytes) {
  const destination = resolve(repo, relativePath)
  mkdirSync(dirname(destination), { recursive: true })
  writeFileSync(destination, bytes)
}

const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
const smallStrokeWidths = new Map([[16, 105], [24, 75], [32, 60], [48, 45], [64, 35]])
const iconPngs = new Map(sizes.map((size) => {
  const strokeWidth = smallStrokeWidths.get(size)
  const source = strokeWidth ? iconSvg.replace('stroke-width="27"', `stroke-width="${strokeWidth}"`) : iconSvg
  return [size, png(source, size)]
}))
for (const [size, bytes] of iconPngs) {
  write(`apps/desktop/resources/icons/${size}x${size}.png`, bytes)
}
write('apps/desktop/resources/icon.png', iconPngs.get(1024))
write('apps/desktop/public/favicon.png', iconPngs.get(64))
write('apps/desktop/public/assets/hyper-studio-logo.png', png(darkSvg, 1024))
write('assets/brand/hyper-studio-mark-dark.png', png(darkSvg, 1024))
write('assets/brand/hyper-studio-mark-light.png', png(lightSvg, 1024))

function makeIco(selected) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(selected.length, 4)
  let offset = 6 + selected.length * 16
  const entries = selected.map((size) => {
    const data = iconPngs.get(size)
    const entry = Buffer.alloc(16)
    entry[0] = size === 256 ? 0 : size
    entry[1] = size === 256 ? 0 : size
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...selected.map((size) => iconPngs.get(size))])
}

function makeIcns() {
  const types = new Map([
    [16, 'icp4'], [32, 'icp5'], [64, 'icp6'], [128, 'ic07'],
    [256, 'ic08'], [512, 'ic09'], [1024, 'ic10'],
  ])
  const chunks = [...types].map(([size, type]) => {
    const data = iconPngs.get(size)
    const header = Buffer.alloc(8)
    header.write(type, 0, 'ascii')
    header.writeUInt32BE(data.length + 8, 4)
    return Buffer.concat([header, data])
  })
  const header = Buffer.alloc(8)
  header.write('icns', 0, 'ascii')
  header.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4)
  return Buffer.concat([header, ...chunks])
}

write('apps/desktop/resources/icon.ico', makeIco([16, 24, 32, 48, 64, 128, 256]))
write('apps/desktop/public/favicon.ico', makeIco([16, 24, 32, 48, 64, 128, 256]))
write('apps/desktop/resources/icon.icns', makeIcns())

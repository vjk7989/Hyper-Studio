import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

// SHA-256 digests are from the official astral-sh/uv release 0.9.26 assets.
const assets = {
  'macos-arm64': {
    name: 'uv-aarch64-apple-darwin.tar.gz',
    sha256: 'fcf0a9ea6599c6ae28a4c854ac6da76f2c889354d7c36ce136ef071f7ab9721f',
    directory: 'uv-aarch64-apple-darwin',
  },
  'linux-x64': {
    name: 'uv-x86_64-unknown-linux-gnu.tar.gz',
    sha256: '30ccbf0a66dc8727a02b0e245c583ee970bdafecf3a443c1686e1b30ec4939e8',
    directory: 'uv-x86_64-unknown-linux-gnu',
  },
}
const target = process.argv[2]
if (!Object.hasOwn(assets, target)) throw new Error('Usage: node scripts/prepare-workflow-tool.mjs macos-arm64|linux-x64')
const asset = assets[target]
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cache = path.join(root, '.local-cache', 'workflow-tools')
const archive = path.join(cache, `uv-0.9.26-${target}.tar.gz`)
const extract = path.join(cache, `uv-0.9.26-${target}`)
const destination = path.join(root, '.tools', 'workflow', target, 'uv')
fs.mkdirSync(cache, { recursive: true })
fs.mkdirSync(path.dirname(destination), { recursive: true })

if (!fs.existsSync(archive)) {
  const url = `https://github.com/astral-sh/uv/releases/download/0.9.26/${asset.name}`
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) })
  if (!response.ok || !response.body) throw new Error(`Official uv download failed (HTTP ${response.status})`)
  const partial = `${archive}.partial`
  try {
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial, { flags: 'wx' }))
    fs.renameSync(partial, archive)
  } finally { if (fs.existsSync(partial)) fs.unlinkSync(partial) }
}
const hash = createHash('sha256')
for await (const chunk of fs.createReadStream(archive)) hash.update(chunk)
if (hash.digest('hex') !== asset.sha256) throw new Error('Pinned uv archive checksum does not match the official release digest')

fs.mkdirSync(extract, { recursive: true })
await new Promise((resolve, reject) => {
  const child = spawn('tar', ['-xzf', archive, '-C', extract, `${asset.directory}/uv`], {
    cwd: root, stdio: 'inherit', windowsHide: true,
  })
  child.once('error', reject)
  child.once('close', code => code === 0 ? resolve() : reject(new Error(`tar failed (exit ${code})`)))
})
const source = path.join(extract, asset.directory, 'uv')
if (!fs.existsSync(source)) throw new Error('Pinned uv archive did not contain the expected executable')
fs.copyFileSync(source, destination)
fs.chmodSync(destination, 0o755)
process.stdout.write(`Prepared ${destination}\n`)

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { ProviderProfileStore, type OsEncryption } from './provider-profiles.ts'

const tempRoot = path.resolve('.local-tmp', 'provider-profile-tests')
fs.mkdirSync(tempRoot, { recursive: true })
const created: string[] = []
const mockOs: OsEncryption = {
  available: () => true,
  encrypt: value => Buffer.from(value).toString('base64'),
  decrypt: value => Buffer.from(value, 'base64').toString('utf8'),
}

function file(): string {
  const dir = fs.mkdtempSync(path.join(tempRoot, 'vault-'))
  created.push(dir)
  return path.join(dir, 'provider-profiles.json')
}

afterEach(() => {
  for (const dir of created.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

describe('provider profile vault', () => {
  it('lists metadata only and retains a secret when editing its profile', () => {
    const vaultPath = file()
    const store = new ProviderProfileStore(vaultPath, mockOs)
    const profile = store.upsert({ name: 'Runway primary', provider: 'runway', apiKey: 'secret-example', defaultModelId: 'gen4' })
    assert.equal(profile.hasApiKey, true)
    assert.equal(Object.hasOwn(profile, 'apiKey'), false)
    assert.equal(store.list()[0].id, profile.id)
    assert.equal(JSON.stringify(store.list()).includes('secret-example'), false)
    store.upsert({ id: profile.id, name: 'Runway secondary', provider: 'runway', defaultModelId: 'gen4' })
    assert.equal(store.snapshot(profile.id).apiKey, 'secret-example')
    assert.equal(store.delete(profile.id), true)
    assert.equal(store.list().length, 0)
  })

  it('uses passphrase encryption when OS storage is unavailable and unlocks after restart', () => {
    const vaultPath = file()
    const noOs: OsEncryption = { available: () => false, encrypt: () => { throw Error('unsafe') }, decrypt: () => { throw Error('unsafe') } }
    const first = new ProviderProfileStore(vaultPath, noOs)
    assert.deepEqual(first.status(), { mode: 'locked', available: false })
    assert.throws(() => first.upsert({ name: 'LTX', provider: 'ltx', apiKey: 'top-secret' }), /set a vault passphrase/)
    first.setPassphrase('long passphrase for test')
    const profile = first.upsert({ name: 'LTX', provider: 'ltx', apiKey: 'top-secret' })
    assert.equal(fs.readFileSync(vaultPath, 'utf8').includes('top-secret'), false)
    first.lock()
    const second = new ProviderProfileStore(vaultPath, noOs)
    assert.deepEqual(second.status(), { mode: 'locked', available: false })
    assert.throws(() => second.snapshot(profile.id), /locked/)
    assert.equal(second.unlock('incorrect passphrase'), false)
    assert.equal(second.unlock('long passphrase for test'), true)
    assert.equal(second.snapshot(profile.id).apiKey, 'top-secret')
  })

  it('does not reuse a credential after the provider or endpoint changes', () => {
    const store = new ProviderProfileStore(file(), mockOs)
    const original = store.upsert({ name: 'Runway', provider: 'runway', apiKey: 'runway-secret' })
    const changedProvider = store.upsert({ id: original.id, name: 'Google', provider: 'veo' })
    assert.equal(changedProvider.hasApiKey, false)
    assert.equal(store.snapshot(original.id).apiKey, undefined)
    const withKey = store.upsert({ id: original.id, name: 'Google', provider: 'veo', baseUrl: 'https://one.example', apiKey: 'new-secret' })
    assert.equal(withKey.hasApiKey, true)
    const changedEndpoint = store.upsert({ id: original.id, name: 'Google', provider: 'veo', baseUrl: 'https://two.example' })
    assert.equal(changedEndpoint.hasApiKey, false)
    assert.equal(store.snapshot(original.id).apiKey, undefined)
  })

  it('fails closed when an OS-encrypted vault becomes unavailable', () => {
    const vaultPath = file()
    const first = new ProviderProfileStore(vaultPath, mockOs)
    const profile = first.upsert({ name: 'Google', provider: 'veo', apiKey: 'only-os-key' })
    const noOs: OsEncryption = { available: () => false, encrypt: () => { throw Error('unsafe') }, decrypt: () => { throw Error('unsafe') } }
    const second = new ProviderProfileStore(vaultPath, noOs)
    assert.deepEqual(second.status(), { mode: 'locked', available: false })
    assert.throws(() => second.snapshot(profile.id), /unavailable/)
    assert.throws(() => second.upsert({ name: 'Nope', provider: 'fal', apiKey: 'new' }), /unavailable/)
  })

  it('accepts localhost HTTP and rejects credential-bearing or public HTTP URLs', () => {
    const store = new ProviderProfileStore(file(), mockOs)
    assert.throws(() => store.upsert({ name: 'Bad', provider: 'custom', baseUrl: 'http://public.example',
      custom: { submitPath: '/jobs', auth: { mode: 'none' }, requestFields: { prompt: 'prompt', model: 'model' }, response: { mode: 'direct', outputPath: 'url' } } }), /HTTPS/)
    assert.throws(() => store.upsert({ name: 'Bad', provider: 'ltx', baseUrl: 'https://user:pass@example.com' }), /must not contain credentials/)
    assert.throws(() => store.upsert({ name: 'Bad', provider: 'ltx', baseUrl: 'https://example.com?api_key=plain' }), /query parameters/)
    assert.throws(() => store.upsert({ name: 'Bad', provider: 'custom', baseUrl: 'https://api.example.com',
      custom: { submitPath: 'https://other.example.com/jobs', auth: { mode: 'bearer' },
        requestFields: { prompt: 'prompt', model: 'model' }, response: { mode: 'direct', outputPath: 'url' } } }), /configured host/)
    assert.throws(() => store.upsert({ name: 'Bad', provider: 'custom', baseUrl: 'https://api.example.com',
      custom: { submitPath: '/jobs?api_key=plaintext-secret', auth: { mode: 'none' },
        requestFields: { prompt: 'prompt', model: 'model' }, response: { mode: 'direct', outputPath: 'url' } } }), /query parameters/)
    assert.throws(() => store.upsert({ name: 'Bad', provider: 'custom', baseUrl: 'https://api.example.com',
      custom: { submitPath: '/jobs', auth: { mode: 'none' }, requestFields: { prompt: 'prompt', model: 'model' },
        response: { mode: 'async', jobIdPath: 'id', pollPath: '/jobs/{jobId}?token=plaintext-secret', statusPath: 'status', outputPath: 'url' } } }), /query parameters/)
    const local = store.upsert({ name: 'Local', provider: 'custom', baseUrl: 'http://localhost:8000',
      custom: { submitPath: '/jobs', auth: { mode: 'none' }, requestFields: { prompt: 'prompt', model: 'model' }, response: { mode: 'direct', outputPath: 'url' } } })
    assert.equal(local.baseUrl, 'http://localhost:8000')
  })
})

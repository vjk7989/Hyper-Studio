import fs from 'node:fs'
import path from 'node:path'
import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scryptSync } from 'node:crypto'
import type { CustomHttpMapping, ProviderKind, ProviderProfileMetadata } from '../shared/electron-api-schema'

type ProfileRecord = ProviderProfileMetadata & { encryptedKey?: string }
type VaultFile = {
  version: 1
  encryption: { mode: 'os' } | { mode: 'passphrase'; salt: string; verifier: string }
  profiles: ProfileRecord[]
}
export type ProfileInput = {
  id?: string; name: string; provider: ProviderKind; baseUrl?: string
  defaultModelId?: string; apiKey?: string; custom?: CustomHttpMapping
}
export type ProfileSnapshot = {
  id: string; name: string; provider: ProviderKind; baseUrl?: string
  apiKey?: string; defaultModelId?: string; custom?: CustomHttpMapping
}
export type OsEncryption = {
  available(): boolean
  encrypt(value: string): string
  decrypt(value: string): string
}

function seal(value: string, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64')
}

function unseal(value: string, key: Buffer): string {
  try {
    const packed = Buffer.from(value, 'base64')
    if (packed.length < 29) throw new Error('invalid')
    const decipher = createDecipheriv('aes-256-gcm', key, packed.subarray(0, 12))
    decipher.setAuthTag(packed.subarray(12, 28))
    return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8')
  } catch { throw new Error('Unable to unlock provider vault') }
}

function validateUrl(value: string | undefined, provider: ProviderKind): void {
  if (!value) {
    if (provider === 'custom') throw new Error('Custom profiles require a base URL')
    return
  }
  let parsed: URL
  try { parsed = new URL(value) } catch { throw new Error('Invalid provider URL') }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Provider URL must use HTTP or HTTPS')
  if (parsed.username || parsed.password) throw new Error('Provider URL must not contain credentials')
  if (parsed.search || parsed.hash) throw new Error('Provider base URL cannot contain query parameters or a fragment')
  if (parsed.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    && !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
    throw new Error('Public provider URLs must use HTTPS')
  }
}

function metadata(record: ProfileRecord): ProviderProfileMetadata {
  const { encryptedKey: _secret, ...visible } = record
  return { ...visible, hasApiKey: Boolean(record.encryptedKey) }
}

export class ProviderProfileStore {
  private key: Buffer | null = null
  private readonly file: string
  private readonly os: OsEncryption
  constructor(file: string, os: OsEncryption) {
    this.file = file
    this.os = os
  }

  private read(): VaultFile | null {
    if (!fs.existsSync(this.file)) return null
    const data = JSON.parse(fs.readFileSync(this.file, 'utf8')) as VaultFile
    if (data.version !== 1 || !Array.isArray(data.profiles) || !['os', 'passphrase'].includes(data.encryption?.mode)) {
      throw new Error('Invalid provider vault')
    }
    return data
  }

  private write(data: VaultFile): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    const temporary = `${this.file}.${randomUUID()}.tmp`
    try {
      fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 })
      fs.renameSync(temporary, this.file)
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
    }
  }

  status(): { mode: 'os' | 'passphrase' | 'locked'; available: boolean } {
    const data = this.read()
    if (!data) return this.os.available() ? { mode: 'os', available: true } : { mode: 'locked', available: false }
    if (data.encryption.mode === 'os') return this.os.available()
      ? { mode: 'os', available: true } : { mode: 'locked', available: false }
    return this.key ? { mode: 'passphrase', available: true } : { mode: 'locked', available: false }
  }

  setPassphrase(passphrase: string): void {
    if (passphrase.length < 12) throw new Error('Passphrase must have at least 12 characters')
    const existing = this.read()
    if (existing) throw new Error('Provider vault is already initialized')
    const salt = randomBytes(16)
    this.key = scryptSync(passphrase, salt, 32)
    this.write({ version: 1, encryption: { mode: 'passphrase', salt: salt.toString('base64'),
      verifier: seal('hyper-studio-provider-vault', this.key) }, profiles: [] })
  }

  unlock(passphrase: string): boolean {
    const data = this.read()
    if (!data || data.encryption.mode !== 'passphrase') return false
    const candidate = scryptSync(passphrase, Buffer.from(data.encryption.salt, 'base64'), 32)
    try {
      if (unseal(data.encryption.verifier, candidate) !== 'hyper-studio-provider-vault') return false
      this.key = candidate
      return true
    } catch { return false }
  }

  lock(): void {
    this.key?.fill(0)
    this.key = null
  }

  private mutableVault(): VaultFile {
    const existing = this.read()
    if (existing) {
      if (existing.encryption.mode === 'os' && !this.os.available()) throw new Error('OS credential store is unavailable')
      if (existing.encryption.mode === 'passphrase' && !this.key) throw new Error('Provider vault is locked')
      return existing
    }
    if (!this.os.available()) throw new Error('OS credential store is unavailable; set a vault passphrase')
    return { version: 1, encryption: { mode: 'os' }, profiles: [] }
  }

  list(): ProviderProfileMetadata[] {
    return (this.read()?.profiles ?? []).map(metadata)
  }

  upsert(input: ProfileInput): ProviderProfileMetadata {
    validateUrl(input.baseUrl, input.provider)
    if (!input.name.trim()) throw new Error('Profile name is required')
    if (input.provider === 'custom' && !input.custom) throw new Error('Custom HTTP mapping is required')
    if (input.provider !== 'custom' && input.custom) throw new Error('Custom HTTP mapping requires a Custom profile')
    if (input.custom) {
      const { auth, response } = input.custom
      if ((auth.mode === 'header' || auth.mode === 'query') && !auth.name?.trim()) {
        throw new Error('Custom authentication name is required')
      }
      if (auth.name && !/^[A-Za-z0-9_-]+$/.test(auth.name)) throw new Error('Invalid custom authentication name')
      if (response.mode === 'async' && (!response.jobIdPath || !response.pollPath || !response.statusPath)) {
        throw new Error('Async custom providers need job ID, poll URL, and status mappings')
      }
      const base = new URL(input.baseUrl!)
      for (const mappedPath of [input.custom.submitPath, response.pollPath].filter((value): value is string => Boolean(value))) {
        const mapped = new URL(mappedPath, input.baseUrl!.endsWith('/') ? input.baseUrl! : `${input.baseUrl!}/`)
        if (mapped.origin !== base.origin || mapped.username || mapped.password) {
          throw new Error('Custom provider paths must stay on the configured host')
        }
        if (mapped.search || mapped.hash) {
          throw new Error('Custom provider paths cannot contain query parameters or a fragment')
        }
      }
    }
    if (input.apiKey != null && !input.apiKey.trim()) throw new Error('API key cannot be blank')
    const data = this.mutableVault()
    const existing = input.id ? data.profiles.find(item => item.id === input.id) : undefined
    if (input.id && !existing) throw new Error('Provider profile not found')
    // Never forward an existing credential to a different provider or endpoint
    // when the user edits a profile without entering a replacement key.
    const retainedKey = existing?.provider === input.provider
      && existing.baseUrl === (input.baseUrl?.trim() || undefined) ? existing.encryptedKey : undefined
    const now = Date.now()
    const next: ProfileRecord = {
      id: existing?.id ?? randomUUID(), name: input.name.trim(), provider: input.provider,
      baseUrl: input.baseUrl?.trim() || undefined, defaultModelId: input.defaultModelId?.trim() || undefined,
      custom: input.custom, hasApiKey: Boolean(input.apiKey || retainedKey),
      createdAt: existing?.createdAt ?? now, updatedAt: now,
      encryptedKey: input.apiKey ? this.encrypt(input.apiKey.trim(), data) : retainedKey,
    }
    data.profiles = [...data.profiles.filter(item => item.id !== next.id), next]
    this.write(data)
    return metadata(next)
  }

  delete(id: string): boolean {
    const data = this.mutableVault()
    const before = data.profiles.length
    data.profiles = data.profiles.filter(item => item.id !== id)
    if (data.profiles.length === before) return false
    this.write(data)
    return true
  }

  snapshot(id: string): ProfileSnapshot {
    const data = this.read()
    const profile = data?.profiles.find(item => item.id === id)
    if (!profile || !data) throw new Error('Provider profile not found')
    const { encryptedKey: _secret, hasApiKey: _hasApiKey, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = profile
    return { ...rest, apiKey: profile.encryptedKey ? this.decrypt(profile.encryptedKey, data) : undefined }
  }

  private encrypt(secret: string, vault: VaultFile): string {
    if (vault.encryption.mode === 'os') return this.os.encrypt(secret)
    if (!this.key) throw new Error('Provider vault is locked')
    return seal(secret, this.key)
  }

  private decrypt(secret: string, vault: VaultFile): string {
    if (vault.encryption.mode === 'os') {
      if (!this.os.available()) throw new Error('OS credential store is unavailable')
      return this.os.decrypt(secret)
    }
    if (!this.key) throw new Error('Provider vault is locked')
    return unseal(secret, this.key)
  }
}

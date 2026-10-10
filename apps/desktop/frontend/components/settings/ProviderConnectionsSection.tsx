import { useEffect, useState } from 'react'
import type { CustomHttpMapping, ProviderKind, ProviderModel, ProviderProfileMetadata } from '../../../shared/electron-api-schema'
import { validateCustomHttpMapping } from '../../lib/custom-http-validation'

const PROVIDERS: Array<{ id: ProviderKind; label: string }> = [
  { id: 'ltx', label: 'LTX Video' },
  { id: 'runway', label: 'Runway' },
  { id: 'veo', label: 'Google Veo' },
  { id: 'fal', label: 'fal.ai' },
  { id: 'custom', label: 'Custom HTTP' },
]

const INITIAL_CUSTOM: CustomHttpMapping = {
  submitPath: '/generate', auth: { mode: 'bearer' },
  requestFields: { prompt: 'prompt', model: 'model' },
  response: { mode: 'direct', outputPath: 'output.url' },
}

const inputClass = 'w-full rounded-lg border border-separator bg-surface-primary px-3 py-2 text-fg-primary'
const buttonClass = 'rounded-lg border border-separator px-3 py-2 text-fg-primary hover:bg-action disabled:opacity-50'

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="block text-sm text-fg-secondary">{label}<input className={`mt-1 ${inputClass}`} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} autoComplete={type === 'password' ? 'off' : undefined} /></label>
}

function splitStatuses(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

export function ProviderConnectionsSection() {
  const [profiles, setProfiles] = useState<ProviderProfileMetadata[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<ProviderKind>('ltx')
  const [baseUrl, setBaseUrl] = useState('')
  const [defaultModelId, setDefaultModelId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [custom, setCustom] = useState<CustomHttpMapping>(INITIAL_CUSTOM)
  const [models, setModels] = useState<ProviderModel[]>([])
  const [vault, setVault] = useState<{ mode: 'os' | 'passphrase' | 'locked'; available: boolean } | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selectedProfile = profiles.find(profile => profile.id === selectedId)
  const connectionChanged = Boolean(selectedProfile?.hasApiKey && (
    provider !== selectedProfile.provider || baseUrl.trim() !== (selectedProfile.baseUrl ?? '')
  ))

  const refresh = async () => {
    const [nextProfiles, nextVault] = await Promise.all([
      window.electronAPI.listProviderProfiles(), window.electronAPI.getProviderVaultStatus(),
    ])
    setProfiles(nextProfiles)
    setVault(nextVault)
    window.dispatchEvent(new Event('hyper-studio-profiles-changed'))
  }

  useEffect(() => { void refresh().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))) }, [])

  const chooseProfile = (profile: ProviderProfileMetadata | null) => {
    setSelectedId(profile?.id ?? null)
    setName(profile?.name ?? '')
    setProvider(profile?.provider ?? 'ltx')
    setBaseUrl(profile?.baseUrl ?? '')
    setDefaultModelId(profile?.defaultModelId ?? '')
    setCustom(profile?.custom ?? INITIAL_CUSTOM)
    setApiKey('')
    setModels([])
    setError(null)
    setMessage(null)
    if (profile) void window.electronAPI.listProviderModels({ profileId: profile.id }).then(setModels).catch(() => undefined)
  }

  const save = async () => {
    setError(null)
    setMessage(null)
    if (!name.trim()) { setError('Enter a profile name.'); return }
    if (provider === 'custom') {
      if (!baseUrl.trim()) { setError('Enter the custom API base URL.'); return }
      const mappingError = validateCustomHttpMapping(custom)
      if (mappingError) { setError(mappingError); return }
    }
    setBusy(true)
    try {
      const saved = await window.electronAPI.upsertProviderProfile({
        ...(selectedId ? { id: selectedId } : {}), name: name.trim(), provider,
        ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
        ...(defaultModelId.trim() ? { defaultModelId: defaultModelId.trim() } : {}),
        ...(apiKey ? { apiKey } : {}),
        ...(provider === 'custom' ? { custom } : {}),
      })
      setApiKey('')
      await refresh()
      chooseProfile(saved)
      setMessage('Connection saved. Both modes can use it.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the connection.')
    } finally { setBusy(false) }
  }

  const remove = async () => {
    if (!selectedId || !confirm(`Delete the connection “${name}”? Running jobs will keep their submitted configuration.`)) return
    setBusy(true)
    try {
      await window.electronAPI.deleteProviderProfile({ id: selectedId })
      await refresh()
      chooseProfile(null)
      setMessage('Connection deleted.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setBusy(false) }
  }

  const test = async () => {
    if (!selectedId) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await window.electronAPI.testProviderProfile({ id: selectedId })
      if (result.ok) setMessage(result.checkType === 'configuration' ? `Configuration valid. ${result.message}` : result.message)
      else setError(result.message)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setBusy(false) }
  }

  const manageVault = async (initialize: boolean) => {
    setError(null)
    try {
      const unlocked = initialize
        ? await window.electronAPI.setProviderVaultPassphrase({ passphrase })
        : await window.electronAPI.unlockProviderVault({ passphrase })
      if (!unlocked) throw new Error('The vault could not be unlocked.')
      setPassphrase('')
      await refresh()
      setMessage('Secure connection storage is ready.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }

  const importLegacyKeys = async () => {
    if (!confirm('Import existing LTX, fal.ai, and Gemini keys into Hyper-Studio secure storage? The old settings will remain unchanged.')) return
    setError(null)
    try {
      const result = await window.electronAPI.importLegacyProviderKeys({ confirmed: true })
      await refresh()
      setMessage(result.imported.length ? `Imported ${result.imported.join(', ')} connection keys.` : 'No existing keys were found.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }

  return <section className="space-y-5 text-fg-primary">
    <p className="text-sm text-fg-secondary">Create named connections once, then choose a connection and model for each project or job. Keys stay in the secure local vault.</p>
    <button type="button" className={buttonClass} onClick={() => void importLegacyKeys()}>Import existing keys</button>
    {vault && !vault.available && <div className="rounded-lg border border-separator bg-surface-secondary p-4 space-y-3"><h3 className="font-medium">Unlock secure storage</h3><p className="text-sm text-fg-secondary">Enter your vault passphrase. New Linux vaults need a passphrase of at least 12 characters.</p><Field label="Vault passphrase" value={passphrase} onChange={setPassphrase} type="password" /><div className="flex gap-2"><button className={buttonClass} onClick={() => void manageVault(false)}>Unlock</button><button className={buttonClass} disabled={passphrase.length < 12} onClick={() => void manageVault(true)}>Create vault</button></div></div>}
    <div className="grid gap-5 md:grid-cols-[minmax(150px,220px)_1fr]">
      <div><h3 className="mb-2 font-medium">Connections</h3><div className="space-y-1">{profiles.map(profile => <button key={profile.id} type="button" onClick={() => chooseProfile(profile)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${selectedId === profile.id ? 'bg-action' : 'hover:bg-action'}`}>{profile.name}<span className="ml-2 text-fg-secondary">{PROVIDERS.find(item => item.id === profile.provider)?.label}</span></button>)}</div><button type="button" className={`mt-3 ${buttonClass}`} onClick={() => chooseProfile(null)}>Add connection</button></div>
      <div className="space-y-3"><Field label="Connection name" value={name} onChange={setName} placeholder="My video API" /><label className="block text-sm text-fg-secondary">Provider<select className={`mt-1 ${inputClass}`} value={provider} onChange={event => setProvider(event.target.value as ProviderKind)}>{PROVIDERS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><Field label="Base URL" value={baseUrl} onChange={setBaseUrl} placeholder={provider === 'custom' ? 'https://api.example.com' : 'Optional override'} /><Field label="Default model ID" value={defaultModelId} onChange={setDefaultModelId} placeholder="Enter or choose a model" />{models.length > 0 && <label className="block text-sm text-fg-secondary">Available models<select className={`mt-1 ${inputClass}`} value="" onChange={event => setDefaultModelId(event.target.value)}><option value="">Choose a model</option>{models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>}<Field label={selectedId ? 'Replace API key (leave blank to keep)' : 'API key'} value={apiKey} onChange={setApiKey} type="password" placeholder={profiles.find(item => item.id === selectedId)?.hasApiKey ? 'Key saved securely' : 'Enter a key if required'} />
      {provider === 'custom' && <div className="space-y-3 rounded-lg border border-separator p-4"><h4 className="font-medium">Custom HTTP contract</h4><Field label="Submit path" value={custom.submitPath} onChange={submitPath => setCustom(prev => ({ ...prev, submitPath }))} placeholder="/generate" /><label className="block text-sm text-fg-secondary">Authentication<select className={`mt-1 ${inputClass}`} value={custom.auth.mode} onChange={event => setCustom(prev => ({ ...prev, auth: { ...prev.auth, mode: event.target.value as CustomHttpMapping['auth']['mode'] } }))}><option value="none">None</option><option value="bearer">Bearer token</option><option value="header">Named header</option><option value="query">Query parameter</option></select></label>{(custom.auth.mode === 'header' || custom.auth.mode === 'query') && <Field label="Header or query name" value={custom.auth.name ?? ''} onChange={name => setCustom(prev => ({ ...prev, auth: { ...prev.auth, name } }))} />}<div className="grid gap-3 sm:grid-cols-2"><Field label="Prompt request field" value={custom.requestFields.prompt} onChange={prompt => setCustom(prev => ({ ...prev, requestFields: { ...prev.requestFields, prompt } }))} /><Field label="Model request field" value={custom.requestFields.model} onChange={model => setCustom(prev => ({ ...prev, requestFields: { ...prev.requestFields, model } }))} /><Field label="Input image field" value={custom.requestFields.inputImage ?? ''} onChange={inputImage => setCustom(prev => ({ ...prev, requestFields: { ...prev.requestFields, inputImage } }))} /><Field label="Options field" value={custom.requestFields.options ?? ''} onChange={options => setCustom(prev => ({ ...prev, requestFields: { ...prev.requestFields, options } }))} /></div><label className="block text-sm text-fg-secondary">Response type<select className={`mt-1 ${inputClass}`} value={custom.response.mode} onChange={event => setCustom(prev => ({ ...prev, response: { ...prev.response, mode: event.target.value as 'direct' | 'async' } }))}><option value="direct">Direct output</option><option value="async">Job ID and polling</option></select></label><Field label="Output field path" value={custom.response.outputPath} onChange={outputPath => setCustom(prev => ({ ...prev, response: { ...prev.response, outputPath } }))} placeholder="output.url" />{custom.response.mode === 'async' && <div className="grid gap-3 sm:grid-cols-2"><Field label="Job ID field path" value={custom.response.jobIdPath ?? ''} onChange={jobIdPath => setCustom(prev => ({ ...prev, response: { ...prev.response, jobIdPath } }))} /><Field label="Poll path (include {jobId})" value={custom.response.pollPath ?? ''} onChange={pollPath => setCustom(prev => ({ ...prev, response: { ...prev.response, pollPath } }))} /><Field label="Status field path" value={custom.response.statusPath ?? ''} onChange={statusPath => setCustom(prev => ({ ...prev, response: { ...prev.response, statusPath } }))} /><Field label="Progress field path" value={custom.response.progressPath ?? ''} onChange={progressPath => setCustom(prev => ({ ...prev, response: { ...prev.response, progressPath } }))} /><Field label="Completion statuses (comma separated)" value={(custom.response.completeValues ?? []).join(', ')} onChange={value => setCustom(prev => ({ ...prev, response: { ...prev.response, completeValues: splitStatuses(value) } }))} /><Field label="Failure statuses (comma separated)" value={(custom.response.failureValues ?? []).join(', ')} onChange={value => setCustom(prev => ({ ...prev, response: { ...prev.response, failureValues: splitStatuses(value) } }))} /></div>}</div>}
      {connectionChanged && !apiKey && <p className="text-sm text-fg-secondary">Changing the provider or base URL clears its saved API key. Enter a new key to use this connection after saving.</p>}{error && <p role="alert" className="text-sm text-fg-danger">{error}</p>}{message && <p role="status" className="text-sm text-fg-secondary">{message}</p>}<div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={busy || !vault?.available} onClick={() => void save()}>{busy ? 'Working...' : 'Save connection'}</button><button type="button" className={buttonClass} disabled={busy || !selectedId} onClick={() => void test()}>Check configuration</button><button type="button" className={buttonClass} disabled={busy || !selectedId} onClick={() => void remove()}>Delete</button></div></div>
    </div>
  </section>
}

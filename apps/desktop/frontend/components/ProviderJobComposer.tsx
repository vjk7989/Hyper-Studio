import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useProviderModels, useProviderProfiles } from '../hooks/use-provider-profiles'
import { useProviderJob } from '../hooks/use-provider-job'
import { paths } from '../paths'

export function ProviderJobComposer({ projectId, defaultProfileId, defaultModelId, prompt: suppliedPrompt, imagePath }: { projectId: string; defaultProfileId?: string; defaultModelId?: string; prompt?: string; imagePath?: string }) {
  const { profiles, error: profilesError } = useProviderProfiles()
  const [profileId, setProfileId] = useState(defaultProfileId ?? '')
  const [modelId, setModelId] = useState(defaultModelId ?? '')
  const [ownPrompt, setOwnPrompt] = useState('')
  const [duration, setDuration] = useState('')
  const { job, error, submitting, submit, cancel } = useProviderJob()
  const selected = profiles.find(profile => profile.id === profileId)
  const models = useProviderModels(selected?.id ?? null)
  const prompt = suppliedPrompt ?? ownPrompt

  useEffect(() => { setProfileId(defaultProfileId ?? '') }, [defaultProfileId])
  useEffect(() => { setModelId(defaultModelId ?? selected?.defaultModelId ?? '') }, [defaultModelId, selected?.defaultModelId])

  const start = () => {
    if (!selected || !modelId.trim() || !prompt.trim()) return
    const parsedDuration = Number(duration)
    void submit({
      projectId, profileId: selected.id, modelId: modelId.trim(), prompt: prompt.trim(),
      ...(imagePath ? { inputs: { image: imagePath } } : {}),
      ...(duration && Number.isFinite(parsedDuration) && parsedDuration > 0 ? { options: { duration: parsedDuration } } : {}),
    })
  }

  return <div className="rounded-lg border border-separator bg-surface-primary p-4 text-fg-primary"><div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="font-medium">Generate with a connection</h3><Link to={`${paths.settings}?tab=connections`} className="text-xs underline">Manage connections</Link></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-fg-secondary">Connection<select aria-label="Job connection" className="mt-1 w-full rounded border border-separator bg-surface-primary px-2 py-2 text-fg-primary" value={selected?.id ?? ''} onChange={event => { setProfileId(event.target.value); setModelId('') }}><option value="">Choose a connection</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><label className="text-xs text-fg-secondary">Model ID<input aria-label="Job model" className="mt-1 w-full rounded border border-separator bg-surface-primary px-2 py-2 text-fg-primary" list={`provider-models-${projectId}`} value={modelId} onChange={event => setModelId(event.target.value)} placeholder="Choose or enter model ID" /><datalist id={`provider-models-${projectId}`}>{models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}</datalist></label></div>{suppliedPrompt === undefined ? <label className="mt-3 block text-xs text-fg-secondary">Prompt<textarea aria-label="Job prompt" className="mt-1 w-full rounded border border-separator bg-surface-primary px-2 py-2 text-fg-primary" rows={3} value={ownPrompt} onChange={event => setOwnPrompt(event.target.value)} /></label> : <p className="mt-3 text-xs text-fg-secondary">Uses the prompt in the form below.</p>}<label className="mt-3 block text-xs text-fg-secondary">Duration in seconds (optional)<input aria-label="Job duration" className="mt-1 w-36 rounded border border-separator bg-surface-primary px-2 py-2 text-fg-primary" type="number" min="1" value={duration} onChange={event => setDuration(event.target.value)} /></label>{profilesError && <p role="alert" className="mt-2 text-xs text-fg-danger">{profilesError}</p>}{error && <p role="alert" className="mt-2 text-xs text-fg-danger">{error}</p>}<div className="mt-3 flex items-center gap-3"><button type="button" className="rounded-lg border border-separator px-3 py-2 text-sm hover:bg-action disabled:opacity-50" disabled={!selected || !modelId.trim() || !prompt.trim() || submitting} onClick={start}>{submitting ? 'Submitting...' : 'Generate video'}</button>{job && (job.status === 'queued' || job.status === 'running') && <button type="button" className="text-xs underline" onClick={() => void cancel()}>Stop tracking</button>}{job && <span role="status" className="text-xs text-fg-secondary">{job.status} {Math.round(job.progress)}%</span>}</div>{job?.error && <p role="alert" className="mt-2 text-xs text-fg-danger">{job.error}</p>}{job?.outputs.length ? <ul className="mt-2 text-xs text-fg-secondary">{job.outputs.map(output => <li key={output.id}>{output.relativePath}</li>)}</ul> : null}</div>
}

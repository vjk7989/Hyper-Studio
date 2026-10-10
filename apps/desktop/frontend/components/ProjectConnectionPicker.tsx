import { Link } from 'react-router'
import { useProviderModels, useProviderProfiles } from '../hooks/use-provider-profiles'
import { paths } from '../paths'
import type { Project } from '../types/project-model'

export function ProjectConnectionPicker({ project, onChange }: { project: Project; onChange: (updates: Partial<Project>) => void }) {
  const { profiles } = useProviderProfiles()
  const selected = profiles.find(profile => profile.id === project.defaultProfileId)
  const models = useProviderModels(selected?.id ?? null)
  return <div className="window-no-drag flex items-center gap-2 text-xs text-fg-secondary">
    <label htmlFor="project-default-profile">Default connection</label>
    <select id="project-default-profile" aria-label="Project default connection" className="max-w-40 rounded border border-separator bg-surface-primary px-2 py-1 text-fg-primary" value={selected?.id ?? ''} onChange={event => onChange({ defaultProfileId: event.target.value || undefined, defaultModelId: undefined })}>
      <option value="">Choose connection</option>
      {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
    </select>
    {selected ? <><label htmlFor="project-default-model">Model</label><input id="project-default-model" aria-label="Project default model" className="max-w-36 rounded border border-separator bg-surface-primary px-2 py-1 text-fg-primary" list="project-models" value={project.defaultModelId ?? selected.defaultModelId ?? ''} onChange={event => onChange({ defaultModelId: event.target.value || undefined })} placeholder="Model ID" /><datalist id="project-models">{models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}</datalist></> : <Link to={`${paths.settings}?tab=connections`} className="underline">Add connection</Link>}
  </div>
}

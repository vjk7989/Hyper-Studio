import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { Text } from '@ds/Text/Text'
import { Button } from '@ds/Button/Button'

export function SharedStorageSetup({ onComplete, initialError }: { onComplete: (folder: string) => void; initialError?: string | null }) {
  const [folder, setFolder] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [saving, setSaving] = useState(false)

  const chooseFolder = async () => {
    try {
      const chosen = await window.electronAPI.selectProjectFolder()
      if (chosen) { setFolder(chosen); setError(null) }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the folder picker.')
    }
  }

  const continueSetup = async () => {
    if (!folder || saving) return
    setSaving(true)
    setError(null)
    try {
      const saved = await window.electronAPI.setSharedStorageRoot({ folder })
      onComplete(saved)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not prepare shared storage.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-secondary p-6">
      <div className="w-full max-w-lg rounded-lg border border-separator bg-surface-primary p-8 shadow-lg">
        <Text as="h1" variant="heading" size="xl">Choose shared storage</Text>
        <Text as="p" variant="body" size="md" className="mt-3 text-fg-secondary">
          Before setup, choose where Hyper-Studio will keep managed runtimes, models, caches, and connection settings. Choose a drive with enough free space.
        </Text>
        <button type="button" onClick={() => { void chooseFolder() }} className="mt-6 w-full rounded-lg border border-separator px-4 py-3 text-left text-fg-primary hover:bg-action">
          <FolderOpen className="mr-2 inline h-5 w-5" />{folder ?? 'Choose a folder'}
        </button>
        {error && <div role="alert"><Text as="p" variant="body" size="sm" className="mt-3 text-fg-danger">{error}</Text></div>}
        <div className="mt-6 flex justify-end">
          <Button appearance="brand" hierarchy="primary" size="md" label={saving ? 'Preparing...' : 'Continue'} disabled={!folder || saving} onClick={() => { void continueSetup() }} />
        </div>
      </div>
    </div>
  )
}

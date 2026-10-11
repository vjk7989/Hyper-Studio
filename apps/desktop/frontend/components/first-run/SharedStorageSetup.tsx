import { useRef, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { Text } from '@ds/Text/Text'
import { Button } from '@ds/Button/Button'

export function SharedStorageSetup({ onComplete, initialError }: { onComplete: (folder: string) => void; initialError?: string | null }) {
  const [folder, setFolder] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [choosing, setChoosing] = useState(false)
  const [saving, setSaving] = useState(false)
  const chooseButton = useRef<HTMLButtonElement>(null)

  const chooseFolder = async () => {
    if (choosing || saving) return
    setChoosing(true)
    try {
      const chosen = await window.electronAPI.selectProjectFolder()
      if (chosen) { setFolder(chosen); setError(null) }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the folder picker.')
    } finally {
      setChoosing(false)
      requestAnimationFrame(() => chooseButton.current?.focus())
    }
  }

  const continueSetup = async () => {
    if (!folder || choosing || saving) return
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
      <div aria-busy={choosing || saving} className="w-full max-w-lg rounded-lg border border-separator bg-surface-primary p-8 shadow-lg">
        <Text as="h1" variant="heading" size="xl">Choose shared storage</Text>
        <Text as="p" variant="body" size="md" className="mt-3 text-fg-secondary">
          Before setup, choose where Hyper-Studio will keep managed runtimes, models, caches, and connection settings. Choose a drive with enough free space.
        </Text>
        <button ref={chooseButton} type="button" disabled={choosing || saving} onClick={() => { void chooseFolder() }} className="mt-6 w-full rounded-lg border border-separator px-4 py-3 text-left text-fg-primary hover:bg-action disabled:opacity-50">
          <FolderOpen className="mr-2 inline h-5 w-5" />{choosing ? 'Opening folder picker…' : folder ?? 'Choose a folder'}
        </button>
        {error && <div role="alert"><Text as="p" variant="body" size="sm" className="mt-3 text-fg-danger">{error}</Text></div>}
        <div className="mt-6 flex justify-end">
          <Button appearance="brand" hierarchy="primary" size="md" label={saving ? 'Preparing…' : 'Continue'} disabled={!folder || choosing || saving} onClick={() => { void continueSetup() }} />
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Sparkles } from 'lucide-react'
import { ProviderConnectionsSection } from '../settings/ProviderConnectionsSection'
import { connectionChoiceEscapeAction, resolveConnectionChoiceState, type ConnectionChoiceState } from './connection-choice-state'

export function ConnectionChoice() {
  const [state, setState] = useState<ConnectionChoiceState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const connectButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const wasVisibleRef = useRef(false)
  const restoreFocusRef = useRef(true)
  const requestRef = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state

  const refresh = useCallback(async () => {
    const request = ++requestRef.current
    try {
      const skipped = await window.electronAPI.getConnectionOnboardingSkipped()
      if (request !== requestRef.current) return
      if (skipped) { setState('hidden'); return }
      const profiles = await window.electronAPI.listProviderProfiles()
      if (request !== requestRef.current) return
      if (profiles.length > 0 && stateRef.current === 'connecting') {
        // A saved profile completes onboarding; a later deletion should not reopen it.
        void window.electronAPI.setConnectionOnboardingSkipped({ skipped: true }).catch(() => undefined)
      }
      setError(null)
      setState(resolveConnectionChoiceState({ skipped, profileCount: profiles.length, currentState: stateRef.current }))
    } catch (cause) {
      if (request !== requestRef.current) return
      setError(cause instanceof Error ? cause.message : 'Could not check saved connections.')
      setState('error')
    }
  }, [])

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    void refresh()
    window.addEventListener('hyper-studio-profiles-changed', refresh)
    return () => {
      requestRef.current++
      window.removeEventListener('hyper-studio-profiles-changed', refresh)
    }
  }, [refresh])

  useEffect(() => {
    if (state === 'hidden') {
      if (wasVisibleRef.current && restoreFocusRef.current && previousFocusRef.current?.isConnected) previousFocusRef.current.focus()
      return
    }
    if (state === 'loading') return
    wasVisibleRef.current = true
    if (state === 'choice' || state === 'error') connectButtonRef.current?.focus()
    if (state === 'connecting') dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [state])

  const explore = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const saved = await window.electronAPI.setConnectionOnboardingSkipped({ skipped: true })
      if (!saved) throw new Error('Could not save your choice. Please retry.')
      setState('hidden')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your choice. Please retry.')
    } finally {
      setBusy(false)
    }
  }, [busy])

  const openLocalModels = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const saved = await window.electronAPI.setConnectionOnboardingSkipped({ skipped: true })
      if (!saved) throw new Error('Could not save your choice. Please retry.')
      restoreFocusRef.current = false
      setState('hidden')
      window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'models' } }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open local model setup.')
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      const action = connectionChoiceEscapeAction(state)
      if (action === 'back') setState('choice')
      else if (action === 'explore') void explore()
      return
    }
    if (event.key !== 'Tab') return
    const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')
    if (!elements?.length) return
    const first = elements[0]
    const last = elements[elements.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  if (state === 'loading' || state === 'hidden') return null

  return <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="connection-choice-title" aria-busy={busy} onKeyDown={onKeyDown} onKeyUp={event => event.stopPropagation()}
      className={`my-auto w-full rounded-xl border border-separator bg-surface-primary text-fg-primary shadow-2xl transition-[max-width] duration-200 motion-reduce:transition-none ${state === 'connecting' ? 'max-w-4xl' : 'max-w-lg'}`}>
      <div className="border-b border-separator p-6">
        {state === 'connecting' && <button type="button" className="mb-4 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-fg-secondary hover:bg-action" onClick={() => setState('choice')}><ArrowLeft size={16} />Back</button>}
        <div className="mb-4 inline-flex rounded-lg bg-action p-3"><KeyRound size={24} aria-hidden="true" /></div>
        <h1 id="connection-choice-title" className="text-xl font-semibold">{state === 'connecting' ? 'Add a video connection' : 'Make something with Hyper-Studio'}</h1>
        <p className="mt-2 text-sm text-fg-secondary">{state === 'connecting'
          ? 'Your connection is saved once and works in Editor and Workflow. You can add others in Settings later.'
          : 'Connect a video API for generation, or start with your own media and add a connection later.'}</p>
      </div>
      <div className="max-h-[min(70vh,780px)] overflow-y-auto p-6">
        {state === 'connecting' ? <ProviderConnectionsSection /> : <div className="grid gap-3">
          <button ref={connectButtonRef} type="button" className="flex w-full items-center justify-between rounded-lg border border-separator p-4 text-left hover:bg-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-fg-primary" onClick={() => setState('connecting')}>
            <span><span className="block font-medium">Connect a video API</span><span className="mt-1 block text-sm text-fg-secondary">Use LTX, Runway, Veo, fal.ai, or a custom endpoint.</span></span><ArrowRight size={18} aria-hidden="true" />
          </button>
          <button type="button" disabled={busy} className="flex w-full items-center justify-between rounded-lg border border-separator p-4 text-left hover:bg-action disabled:opacity-50" onClick={() => void explore()}>
            <span><span className="block font-medium">Explore without a connection</span><span className="mt-1 block text-sm text-fg-secondary">Create a project, import media, and edit without an API key.</span></span>{busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
          </button>
          <button type="button" disabled={busy} className="rounded-lg px-3 py-2 text-left text-sm text-fg-secondary hover:bg-action disabled:opacity-50" onClick={() => void openLocalModels()}>Set up optional local models in Settings</button>
        </div>}
        {state === 'error' && <button type="button" className="mt-4 rounded-lg border border-separator px-3 py-2 text-sm hover:bg-action" onClick={() => void refresh()}>Retry connection check</button>}
        {error && <p role="alert" className="mt-4 text-sm text-fg-danger">{error}</p>}
        {state === 'connecting' && <button type="button" disabled={busy} className="mt-5 rounded-lg border border-separator px-3 py-2 text-sm text-fg-secondary hover:bg-action" onClick={() => void explore()}>Explore without a connection</button>}
      </div>
    </div>
  </div>
}

import { useCallback, useEffect, useState } from 'react'
import type { ProviderJob, ProviderJobInput } from '../../shared/electron-api-schema'

export function useProviderJob() {
  const [job, setJob] = useState<ProviderJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => window.electronAPI.onProviderJobChanged(next => {
    setJob(current => current?.id === next.id ? next : current)
  }), [])

  const submit = useCallback(async (input: ProviderJobInput) => {
    setSubmitting(true)
    setError(null)
    try {
      const submitted = await window.electronAPI.submitProviderJob(input)
      setJob(submitted)
      return submitted
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit the video job.')
      return null
    } finally { setSubmitting(false) }
  }, [])

  const cancel = useCallback(async () => {
    if (!job) return
    try {
      const cancelled = await window.electronAPI.cancelProviderJob({ jobId: job.id })
      if (cancelled) setJob(cancelled)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }, [job])

  return { job, error, submitting, submit, cancel }
}

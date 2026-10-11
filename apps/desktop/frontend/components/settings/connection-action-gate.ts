/** Synchronously excludes overlapping connection actions across React render batches. */
export function createConnectionActionGate(onChange: (action: string | null) => void) {
  let pending: string | null = null
  return {
    get pending() { return pending },
    async run(action: string, task: () => Promise<void>): Promise<boolean> {
      if (pending) return false
      pending = action
      onChange(action)
      try { await task() }
      finally {
        pending = null
        onChange(null)
      }
      return true
    },
  }
}

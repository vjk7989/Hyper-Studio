export type ConnectionChoiceState = 'loading' | 'hidden' | 'choice' | 'connecting' | 'error'

export function resolveConnectionChoiceState({
  skipped,
  profileCount,
  currentState,
}: {
  skipped: boolean
  profileCount: number
  currentState: ConnectionChoiceState
}): ConnectionChoiceState {
  if (skipped || profileCount > 0) return 'hidden'
  return currentState === 'connecting' ? 'connecting' : 'choice'
}

export function connectionChoiceEscapeAction(state: ConnectionChoiceState): 'back' | 'explore' | 'none' {
  if (state === 'connecting') return 'back'
  if (state === 'choice') return 'explore'
  return 'none'
}

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { connectionChoiceEscapeAction, resolveConnectionChoiceState } from './connection-choice-state.ts'

describe('first-run connection choice', () => {
  it('shows the choice only when there are no saved profiles and Explore was not chosen', () => {
    assert.equal(resolveConnectionChoiceState({ skipped: false, profileCount: 0, currentState: 'loading' }), 'choice')
    assert.equal(resolveConnectionChoiceState({ skipped: false, profileCount: 1, currentState: 'loading' }), 'hidden')
    assert.equal(resolveConnectionChoiceState({ skipped: true, profileCount: 0, currentState: 'loading' }), 'hidden')
  })

  it('keeps the connection form open on a profile refresh until one is saved', () => {
    assert.equal(resolveConnectionChoiceState({ skipped: false, profileCount: 0, currentState: 'connecting' }), 'connecting')
    assert.equal(resolveConnectionChoiceState({ skipped: false, profileCount: 2, currentState: 'connecting' }), 'hidden')
  })

  it('returns from Connect on Escape and explores on Escape from the choice', () => {
    assert.equal(connectionChoiceEscapeAction('connecting'), 'back')
    assert.equal(connectionChoiceEscapeAction('choice'), 'explore')
    assert.equal(connectionChoiceEscapeAction('error'), 'explore')
  })
})

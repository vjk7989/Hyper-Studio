import assert from 'node:assert/strict'
import { it } from 'node:test'
import { createDefaultTimeline } from '../../types/project-model.ts'
import { createTimeline } from './editor-actions.ts'
import { createInitialEditorState } from './editor-state.ts'

it('createTimeline avoids an existing default timeline name', () => {
  const first = createDefaultTimeline('Timeline 1')
  const second = createDefaultTimeline('Timeline 2')
  const state = createInitialEditorState({
    assets: [],
    bins: {},
    timelines: [first, second],
    activeTimelineId: first.id,
  })

  const next = createTimeline(state)

  assert.deepEqual(next.editorModel.timelines.map(timeline => timeline.name), [
    'Timeline 1', 'Timeline 2', 'Timeline 3',
  ])
  assert.equal(next.editorModel.activeTimelineId, next.editorModel.timelines[2].id)
  assert.equal(next.editorModel.timelines[0], first)
  assert.equal(next.editorModel.timelines[1], second)
})

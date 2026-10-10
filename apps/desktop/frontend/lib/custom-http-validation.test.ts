import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CustomHttpMapping } from '../../shared/electron-api-schema'
import { validateCustomHttpMapping } from './custom-http-validation.ts'

const direct: CustomHttpMapping = {
  submitPath: '/generate', auth: { mode: 'bearer' },
  requestFields: { prompt: 'prompt', model: 'model' },
  response: { mode: 'direct', outputPath: 'video.url' },
}

describe('custom provider mapping validation', () => {
  it('accepts a direct result and requires the async job contract', () => {
    assert.equal(validateCustomHttpMapping(direct), null)
    assert.match(validateCustomHttpMapping({ ...direct, response: { mode: 'async', outputPath: 'video.url' } }) ?? '', /job ID/)
    assert.equal(validateCustomHttpMapping({ ...direct, response: { mode: 'async', outputPath: 'video.url', jobIdPath: 'id', pollPath: '/jobs/{jobId}', statusPath: 'status', completeValues: ['done'], failureValues: ['failed'] } }), null)
  })

  it('requires a named custom auth field', () => {
    assert.match(validateCustomHttpMapping({ ...direct, auth: { mode: 'header' } }) ?? '', /header/)
  })
})

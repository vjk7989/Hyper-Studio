import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { trustedWorkflowCanvasUrl } from './workflow-canvas-url.ts'

describe('trusted workflow canvas URL', () => {
  it('embeds only a running loopback canvas with an explicit port', () => {
    assert.equal(trustedWorkflowCanvasUrl({ state: 'running', url: 'http://127.0.0.1:8188/' }), 'http://127.0.0.1:8188/')
    assert.equal(trustedWorkflowCanvasUrl({ state: 'starting', url: 'http://127.0.0.1:8188/' }), null)
    for (const url of ['http://localhost:8188/', 'http://127.0.0.1/', 'https://127.0.0.1:8188/', 'http://evil.example:8188/', 'http://user:pass@127.0.0.1:8188/']) {
      assert.equal(trustedWorkflowCanvasUrl({ state: 'running', url }), null, url)
    }
  })
})

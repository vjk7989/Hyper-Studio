import { describe, expect, it, vi } from 'vitest'
import { installHyperStudioEmbedBridge, isSafeWorkflowName, isTrustedHyperStudioHost, markHyperStudioCanvasReady } from './hyperStudioEmbedBridge'

vi.mock('@/scripts/app', () => ({ app: { graphToPrompt: async () => ({ workflow: { nodes: [{ id: 7 }] } }) } }))
const openWorkflowAction = vi.fn(async () => ({ success: true }))
const openManager = vi.fn(async () => {})
vi.mock('@/workbench/extensions/manager/composables/useManagerState', () => ({
  useManagerState: () => ({ openManager })
}))
vi.mock('@/platform/workflow/core/services/workflowActionsService', () => ({
  useWorkflowActionsService: () => ({ openWorkflowAction }),
}))

describe('Hyper-Studio embed bridge boundaries', () => {
  it('only accepts the local desktop host', () => {
    expect(isTrustedHyperStudioHost('null')).toBe(true)
    expect(isTrustedHyperStudioHost('http://127.0.0.1:5173')).toBe(true)
    expect(isTrustedHyperStudioHost('http://localhost:5173')).toBe(true)
    expect(isTrustedHyperStudioHost('https://example.com')).toBe(false)
    expect(isTrustedHyperStudioHost('http://example.com')).toBe(false)
  })

  it('requires a project workflow filename', () => {
    expect(isSafeWorkflowName('scene.json')).toBe(true)
    expect(isSafeWorkflowName('../scene.json')).toBe(false)
    expect(isSafeWorkflowName('sub/scene.json')).toBe(false)
    expect(isSafeWorkflowName('scene.png')).toBe(false)
  })

  it('waits for startup tab restoration before opening a host workflow', async () => {
    openWorkflowAction.mockClear()
    const parent = { postMessage: vi.fn() } as unknown as Window
    const previous = Object.getOwnPropertyDescriptor(window, 'parent')
    Object.defineProperty(window, 'parent', { configurable: true, value: parent })
    try {
      installHyperStudioEmbedBridge()
      window.dispatchEvent(new MessageEvent('message', {
        source: parent, origin: 'null',
        data: { type: 'hyper-studio:open-workflow', name: 'imported.json', workflow: { nodes: [{ id: 90909 }] } },
      }))
      await Promise.resolve()
      expect(openWorkflowAction).not.toHaveBeenCalled()
      markHyperStudioCanvasReady()
      await vi.waitFor(() => expect(openWorkflowAction).toHaveBeenCalledWith(
        { nodes: [{ id: 90909 }] }, 'imported.json'
      ))
    } finally {
      if (previous) Object.defineProperty(window, 'parent', previous)
    }
  })

  it('returns a canvas snapshot only to its parent window', async () => {
    const postMessage = vi.fn()
    const parent = { postMessage } as unknown as Window
    const previous = Object.getOwnPropertyDescriptor(window, 'parent')
    Object.defineProperty(window, 'parent', { configurable: true, value: parent })
    try {
      installHyperStudioEmbedBridge()
      window.dispatchEvent(new MessageEvent('message', {
        source: parent, origin: 'null',
        data: { type: 'hyper-studio:request-workflow', requestId: 'one' },
      }))
      await vi.waitFor(() => expect(postMessage).toHaveBeenCalledWith(
        { type: 'hyper-studio:workflow-snapshot', requestId: 'one', workflow: { nodes: [{ id: 7 }] } }, '*'
      ))
      window.dispatchEvent(new MessageEvent('message', {
        source: parent, origin: 'null',
        data: { type: 'hyper-studio:open-workflow', name: 'scene.json', workflow: { nodes: [{ id: 42 }] } },
      }))
      await vi.waitFor(() => expect(openWorkflowAction).toHaveBeenCalledWith({ nodes: [{ id: 42 }] }, 'scene.json'))
      postMessage.mockClear()
      window.dispatchEvent(new MessageEvent('message', {
        origin: 'https://example.com', data: { type: 'hyper-studio:request-workflow', requestId: 'two' },
      }))
      expect(postMessage).not.toHaveBeenCalled()
    } finally {
      if (previous) Object.defineProperty(window, 'parent', previous)
    }
  })

  it('opens local Extensions only for a trusted parent message', async () => {
    openManager.mockClear()
    const parent = { postMessage: vi.fn() } as unknown as Window
    const previous = Object.getOwnPropertyDescriptor(window, 'parent')
    Object.defineProperty(window, 'parent', { configurable: true, value: parent })
    try {
      installHyperStudioEmbedBridge()
      window.dispatchEvent(new MessageEvent('message', {
        source: parent, origin: 'https://example.com',
        data: { type: 'hyper-studio:open-manager' }
      }))
      expect(openManager).not.toHaveBeenCalled()
      markHyperStudioCanvasReady()
      window.dispatchEvent(new MessageEvent('message', {
        source: parent, origin: 'null',
        data: { type: 'hyper-studio:open-manager' }
      }))
      await vi.waitFor(() => expect(openManager).toHaveBeenCalledWith({ initialTab: 'all' }))
    } finally {
      if (previous) Object.defineProperty(window, 'parent', previous)
    }
  })
})

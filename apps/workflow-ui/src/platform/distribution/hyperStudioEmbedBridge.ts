import type { ComfyWorkflowJSON } from '@/platform/workflow/validation/schemas/workflowSchema'

const MAX_WORKFLOW_BYTES = 20 * 1024 * 1024
let markCanvasReady!: () => void
const canvasReady = new Promise<void>((resolve) => {
  markCanvasReady = resolve
})

/** Host workflow opens must wait until startup has restored its own tabs. */
export function markHyperStudioCanvasReady(): void {
  markCanvasReady()
}

export function isTrustedHyperStudioHost(origin: string): boolean {
  if (origin === 'null' || origin === 'file://') return true
  try {
    const url = new URL(origin)
    return url.protocol === 'http:' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
  } catch {
    return false
  }
}

export function isSafeWorkflowName(name: unknown): name is string {
  return typeof name === 'string' &&
    name.length > 0 && name.length <= 255 &&
    !/[\\/\x00-\x1f]/.test(name) &&
    name !== '.' && name !== '..' &&
    name.toLowerCase().endsWith('.json')
}

function isWorkflow(value: unknown): value is ComfyWorkflowJSON {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (!Array.isArray((value as { nodes?: unknown }).nodes)) return false
  try {
    return new Blob([JSON.stringify(value)]).size <= MAX_WORKFLOW_BYTES
  } catch {
    return false
  }
}

/** The desktop shell owns files; the embedded canvas only receives workflow data. */
export function installHyperStudioEmbedBridge(): void {
  if (window.parent === window) return

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent || !isTrustedHyperStudioHost(event.origin)) return
    const data = event.data as Record<string, unknown> | null
    if (!data || typeof data !== 'object') return

    if (data.type === 'hyper-studio:open-workflow') {
      const reportError = (error: unknown) => {
        window.parent.postMessage(
          { type: 'hyper-studio:workflow-error', error: error instanceof Error ? error.message : String(error) },
          event.origin === 'null' || event.origin === 'file://' ? '*' : event.origin
        )
      }
      if (!isSafeWorkflowName(data.name) || !isWorkflow(data.workflow)) {
        reportError(new Error('Use a valid canvas workflow JSON file under 20 MB'))
        return
      }
      void import('@/platform/workflow/core/services/workflowActionsService')
        .then(async ({ useWorkflowActionsService }) => {
          await canvasReady
          return useWorkflowActionsService().openWorkflowAction(data.workflow as ComfyWorkflowJSON, data.name as string)
        }).then(result => {
          if (!result.success) throw new Error(result.error || 'Could not open workflow')
        }).catch(reportError)
    }

    if (data.type === 'hyper-studio:request-workflow' && typeof data.requestId === 'string' && data.requestId.length <= 100) {
      const reply = (payload: Record<string, unknown>) =>
        window.parent.postMessage(
          { type: 'hyper-studio:workflow-snapshot', requestId: data.requestId, ...payload },
          event.origin === 'null' || event.origin === 'file://' ? '*' : event.origin
        )
      void import('@/scripts/app')
        .then(async ({ app }) => {
          const { workflow } = await app.graphToPrompt()
          if (!isWorkflow(workflow)) throw new Error('The active workflow is invalid or exceeds 20 MB')
          reply({ workflow })
        })
        .catch((error: unknown) => reply({ error: error instanceof Error ? error.message : 'Could not save workflow' }))
    }
  })
}

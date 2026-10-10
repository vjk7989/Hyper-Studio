import { handle } from './typed-handle'
import { getWorkflowEngineStatus, startWorkflowEngine, stopWorkflowEngine } from '../workflow-engine'

export function registerWorkflowEngineHandlers(): void {
  handle('startWorkflowEngine', ({ projectId }) => startWorkflowEngine(projectId))
  handle('getWorkflowEngineStatus', () => getWorkflowEngineStatus())
  handle('stopWorkflowEngine', () => stopWorkflowEngine())
}

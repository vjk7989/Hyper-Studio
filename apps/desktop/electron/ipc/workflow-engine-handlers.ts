import { handle } from './typed-handle'
import { getWorkflowEngineStatus, prewarmWorkflowEngine, startWorkflowEngine, stopWorkflowEngine, stopWorkflowEngineForProject } from '../workflow-engine'

export function registerWorkflowEngineHandlers(): void {
  handle('startWorkflowEngine', ({ projectId }) => startWorkflowEngine(projectId))
  handle('prewarmWorkflowEngine', ({ projectId }) => prewarmWorkflowEngine(projectId))
  handle('getWorkflowEngineStatus', () => getWorkflowEngineStatus())
  handle('stopWorkflowEngine', () => stopWorkflowEngine())
  handle('stopWorkflowEngineForProject', ({ projectId }) => stopWorkflowEngineForProject(projectId))
}

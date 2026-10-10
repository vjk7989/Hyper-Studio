import { Film, FolderOpen, Workflow } from 'lucide-react'
import { Text } from '@ds/Text/Text'
import type { Project } from '../types/project-model'
import styles from './Project.module.scss'

export function WorkflowWorkspace({ project, onSwitchToEditor }: { project: Project; onSwitchToEditor: () => void }) {
  return (
    <div className={styles.workflowWorkspace}>
      <div className={styles.workflowIntro}>
        <Workflow size={28} aria-hidden="true" />
        <Text as="h1" variant="heading" size="xl">Workflow mode</Text>
        <Text as="p" variant="body" size="md" className={styles.workflowDescription}>
          Build generation workflows in this project. Your media library is shared with Editor mode.
        </Text>
      </div>
      <div className={styles.workflowPanel}>
        <div className={styles.workflowPanelHeading}><FolderOpen size={18} aria-hidden="true" /> Project workspace</div>
        <p className={styles.workflowFolder}>{project.projectFolder ?? 'No project folder selected'}</p>
        <p className={styles.workflowDescription}>
          {project.assets.length} {project.assets.length === 1 ? 'asset' : 'assets'} in this project
        </p>
        {project.assets.length > 0 && (
          <ul className={styles.workflowAssets}>
            {project.assets.slice(0, 8).map(asset => (
              <li key={asset.id}>{asset.path.split(/[\\/]/).pop() || 'Untitled asset'}</li>
            ))}
          </ul>
        )}
      </div>
      <p className={styles.workflowDescription}>The node canvas is being integrated into Hyper-Studio. You can switch modes at any time.</p>
      <button type="button" className={styles.workflowEditorButton} onClick={onSwitchToEditor}>
        <Film size={16} aria-hidden="true" /> Open Editor mode
      </button>
    </div>
  )
}

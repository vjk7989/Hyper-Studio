import { Film, FolderOpen, Workflow } from 'lucide-react'
import { Text } from '@ds/Text/Text'
import type { Project } from '../types/project-model'
import type { WorkspaceMediaEntry } from '../../shared/electron-api-schema'
import styles from './Project.module.scss'

export function WorkflowWorkspace({ project, media, onSwitchToEditor }: { project: Project; media: WorkspaceMediaEntry[]; onSwitchToEditor: () => void }) {
  return (
    <div className={styles.workflowWorkspace}>
      <div className={styles.workflowIntro}>
        <Workflow size={28} aria-hidden="true" />
        <Text as="h1" variant="heading" size="xl">Workflow mode</Text>
        <Text as="p" variant="body" size="md" className={styles.workflowDescription}>
          This project uses one media library in Editor and Workflow mode.
        </Text>
      </div>
      <div className={styles.workflowPanel}>
        <div className={styles.workflowPanelHeading}><FolderOpen size={18} aria-hidden="true" /> Project workspace</div>
        <p className={styles.workflowFolder}>{project.projectFolder ?? 'No project folder selected'}</p>
        <p className={styles.workflowDescription}>
          {media.length} {media.length === 1 ? 'file' : 'files'} in the shared media index
        </p>
        {media.length > 0 && (
          <ul className={styles.workflowAssets}>
            {media.slice(0, 8).map(item => (
              <li key={item.id}>{item.relativePath.split(/[\\/]/).pop() || 'Untitled file'}</li>
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

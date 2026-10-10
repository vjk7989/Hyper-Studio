import type { CSSProperties } from 'react'
import styles from './EndpageLockup.module.scss'

export const ENDPAGE_SETTLED_MS = 300

type EndpageLockupProps = {
  still?: boolean
  paused?: boolean
  className?: string
  style?: CSSProperties
}

export function EndpageLockup({ className, style }: EndpageLockupProps) {
  return (
    <div className={`${styles.stage}${className ? ` ${className}` : ''}`} style={style} aria-hidden>
      <div className={styles.brand}>
        <img src="/assets/hyper-studio-logo.png" alt="" />
        <span>Hyper-Studio</span>
      </div>
    </div>
  )
}

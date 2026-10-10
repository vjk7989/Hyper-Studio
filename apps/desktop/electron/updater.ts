import { app } from 'electron'
import type { UpdateStatePayload } from '../shared/electron-api-schema'

export type UpdateChannel = 'latest' | 'beta' | 'alpha'

// Releases are not published yet. Do not contact or install from the former
// product's feed. Preserve the IPC interface for a future Hyper-Studio feed.
const unavailable: UpdateStatePayload = {
  status: 'idle',
  currentVersion: app.getVersion(),
  message: 'Updates are not configured for this build.',
}

export function getUpdateState(): UpdateStatePayload {
  return unavailable
}

export function initAutoUpdater(_channel: UpdateChannel = 'latest'): void {}

export function armPeriodicCheck(): void {}

export async function checkForUpdatesNow(): Promise<void> {}

export async function startUpdateDownload(): Promise<void> {}

export function installUpdateAndRestart(): { success: false; error: string } {
  return { success: false, error: 'Updates are not configured for this build.' }
}

export function skipUpdateVersion(_version: string): void {}

export function setAutoCheckUpdatesEnabled(_enabled: boolean): void {}

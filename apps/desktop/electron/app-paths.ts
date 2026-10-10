import { app } from 'electron'
import path from 'path'
import os from 'os'

export const APP_FOLDER_NAME = 'HyperStudio'
export const LEGACY_APP_FOLDER_NAME = 'LTXDesktop'

function resolveDataPath(folderName: string): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA
      || path.join(os.homedir(), 'AppData', 'Local')
    return path.join(localAppData, folderName)
  }
  if (process.platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      folderName,
    )
  }
  const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
  return path.join(xdgData, folderName)
}

// The old data directory is exposed only for an explicit migration flow. This
// module never writes it, and normal launches use the new product identity.
export function getLegacyAppDataDir(): string {
  return resolveDataPath(LEGACY_APP_FOLDER_NAME)
}

app.setPath('userData', process.env.HYPER_STUDIO_USER_DATA || resolveDataPath(APP_FOLDER_NAME))

export function getAppDataDir(): string {
  return app.getPath('userData')
}

export function getLogDir(): string {
  return path.join(app.getPath('userData'), 'logs')
}

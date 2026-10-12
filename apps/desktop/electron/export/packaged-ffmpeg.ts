import fs from 'fs'
import path from 'path'

/** The standalone export binary is packaged independently of the optional Python runtime. */
export function findPackagedFfmpegPath(
  resourcesPath: string,
  platform: NodeJS.Platform,
  isFile: (filePath: string) => boolean = filePath => {
    try { return fs.statSync(filePath).isFile() } catch { return false }
  },
): string | null {
  const executable = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const candidate = path.join(resourcesPath, 'tools', executable)
  return isFile(candidate) ? candidate : null
}

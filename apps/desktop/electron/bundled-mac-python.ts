import path from 'node:path'

/** The optional legacy backend can start only when its bundled interpreter exists. */
export function hasBundledMacPython(pythonDir: string, exists: (candidate: string) => boolean): boolean {
  return exists(path.join(pythonDir, 'bin', 'python3'))
}

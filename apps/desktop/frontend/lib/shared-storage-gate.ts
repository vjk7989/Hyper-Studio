/** Runtime installation must wait until the shared storage folder is saved. */
export function canStartRuntimeSetup(root: string | null | undefined): root is string {
  return typeof root === 'string' && root.trim().length > 0
}

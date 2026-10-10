/** Read a workspace only after its queued renderer edits have reached the folder. */
export async function loadAfterWorkspaceWrite<T>(
  pendingWrites: ReadonlyMap<string, Promise<unknown>>,
  projectId: string,
  load: () => Promise<T>,
): Promise<T> {
  await pendingWrites.get(projectId)
  return load()
}

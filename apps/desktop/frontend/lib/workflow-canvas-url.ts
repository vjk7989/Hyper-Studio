export function trustedWorkflowCanvasUrl(status: { state: string; url?: string }): string | null {
  if (status.state !== 'running' || !status.url) return null
  try {
    const url = new URL(status.url)
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !/^\d+$/.test(url.port) || url.username || url.password) return null
    return url.href
  } catch { return null }
}

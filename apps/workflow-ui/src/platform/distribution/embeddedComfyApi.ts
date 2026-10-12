/**
 * Embedded builds resolve every inherited API base to the managed local
 * engine origin. This keeps compatibility callers local and ensures no
 * upstream Cloud, account, or platform destination ships in Hyper-Studio.
 */
function localEngineOrigin(): string {
  return window.location.origin
}

export const getComfyApiBaseUrl = localEngineOrigin
export const getComfyCloudBaseUrl = localEngineOrigin
export const getComfyPlatformBaseUrl = localEngineOrigin

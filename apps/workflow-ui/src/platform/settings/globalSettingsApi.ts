import type {
  GlobalSetting,
  GlobalSettingKey,
  GlobalSettingValue
} from '@comfyorg/ingest-types'
import { zErrorResponse, zGlobalSetting } from '@comfyorg/ingest-types/zod'

import { isCloud } from '@/platform/distribution/types'
import { isHyperStudioEmbedded } from '@/platform/distribution/hyperStudio'
import { api } from '@/scripts/api'
import type { AuthHeader } from '@/types/authTypes'

export class GlobalSettingsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'GlobalSettingsApiError'
  }
}

const embeddedBuild =
  import.meta.env.VITE_HYPER_STUDIO_EMBEDDED === 'true'

async function fetchGlobalSetting(
  key: GlobalSettingKey | undefined,
  init: RequestInit
): Promise<Response> {
  const path = `/global-settings${key ? `/${encodeURIComponent(key)}` : ''}`
  if (embeddedBuild || isHyperStudioEmbedded) return api.fetchApi(path, init)

  const [{ getComfyApiBaseUrl }, remint] = await Promise.all([
    import('@/config/comfyApi'),
    import('@/platform/auth/unified/remintRetry')
  ])
  const url = isCloud ? api.apiURL(path) : `${getComfyApiBaseUrl()}/api${path}`
  return remint.fetchWithUnifiedRemint(
    url,
    init,
    await remint.shouldRemintCloudRequest()
  )
}

async function responseBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new GlobalSettingsApiError(
      'Global setting returned invalid JSON',
      response.status
    )
  }
}

async function storedSetting(response: Response): Promise<GlobalSetting> {
  if (!response.ok) {
    throw new GlobalSettingsApiError(
      `Global setting request failed: ${response.status}`,
      response.status
    )
  }
  const payload = zGlobalSetting.safeParse(await responseBody(response))
  if (!payload.success) {
    throw new GlobalSettingsApiError(
      'Global setting returned an invalid response',
      response.status
    )
  }
  return payload.data
}

export async function getGlobalSetting(
  key: GlobalSettingKey,
  authHeader: AuthHeader
): Promise<GlobalSetting | undefined> {
  const response = await fetchGlobalSetting(key, {
    cache: 'no-store',
    headers: authHeader
  })
  if (response.status === 404) {
    const error = zErrorResponse.safeParse(await responseBody(response))
    if (error.success && error.data.code === 'NOT_FOUND') return undefined
  }
  return storedSetting(response)
}

export async function setGlobalSetting(
  setting: GlobalSettingValue,
  authHeader: AuthHeader
): Promise<GlobalSetting> {
  const response = await fetchGlobalSetting(undefined, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(setting)
  })
  return storedSetting(response)
}

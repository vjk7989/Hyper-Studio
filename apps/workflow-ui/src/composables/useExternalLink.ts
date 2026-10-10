import { computed } from 'vue'

import { isDesktop } from '@/platform/distribution/types'
import { electronAPI } from '@/utils/envUtil'
import { i18n } from '@/i18n'
import { isHyperStudioEmbedded } from '@/platform/distribution/hyperStudio'

const HYPER_STUDIO_REPOSITORY = 'https://github.com/vjk7989/Hyper-Studio'

/**
 * Composable for building docs.comfy.org URLs with automatic locale and platform detection
 *
 * @example
 * ```ts
 * const { buildDocsUrl } = useExternalLink()
 *
 * // Simple usage
 * const changelogUrl = buildDocsUrl('/changelog', { includeLocale: true })
 * // => 'https://docs.comfy.org/zh/changelog' (if Chinese)
 *
 * // With platform detection
 * const desktopUrl = buildDocsUrl('/installation/desktop', {
 *   includeLocale: true,
 *   platform: true
 * })
 * // => 'https://docs.comfy.org/zh/installation/desktop/macos' (if Chinese + macOS)
 * ```
 */
export function useExternalLink() {
  const locale = computed(() => i18n.global.locale.value)

  const isChinese = computed(() => {
    return locale.value === 'zh' || locale.value === 'zh-TW'
  })

  const platform = computed(() => {
    if (!isDesktop) {
      return null
    }

    const electronPlatform = electronAPI().getPlatform()
    return electronPlatform === 'darwin' ? 'macos' : 'windows'
  })

  /**
   * Build a docs.comfy.org URL with optional locale and platform
   *
   * @param path - The path after the domain (e.g., '/installation/desktop')
   * @param options - Options for building the URL
   * @param options.includeLocale - Whether to include locale prefix (default: false)
   * @param options.platform - Whether to include platform suffix (default: false)
   * @returns The complete docs URL
   *
   * @example
   * ```ts
   * buildDocsUrl('/changelog') // => 'https://docs.comfy.org/changelog'
   * buildDocsUrl('/changelog', { includeLocale: true }) // => 'https://docs.comfy.org/zh/changelog' (if Chinese)
   * buildDocsUrl('/installation/desktop', { includeLocale: true, platform: true })
   * // => 'https://docs.comfy.org/zh/installation/desktop/macos' (if Chinese + macOS)
   * ```
   */
  const buildDocsUrl = (
    path: string,
    options: {
      includeLocale?: boolean
      platform?: boolean
    } = {}
  ): string => {
    if (isHyperStudioEmbedded) return `${HYPER_STUDIO_REPOSITORY}#readme`
    const { includeLocale = false, platform: includePlatform = false } = options

    let url = 'https://docs.comfy.org'

    if (includeLocale && isChinese.value) {
      url += '/zh'
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    url += normalizedPath

    if (includePlatform && platform.value) {
      url = url.endsWith('/') ? url : `${url}/`
      url += platform.value
    }

    return url
  }

  const staticUrls = {
    // Static external URLs
    discord: isHyperStudioEmbedded ? `${HYPER_STUDIO_REPOSITORY}/issues` : 'https://discord.com/invite/comfyorg',
    github: isHyperStudioEmbedded ? HYPER_STUDIO_REPOSITORY : 'https://github.com/Comfy-Org/ComfyUI',
    githubIssues: isHyperStudioEmbedded ? `${HYPER_STUDIO_REPOSITORY}/issues` : 'https://github.com/Comfy-Org/ComfyUI/issues',
    githubFrontend: isHyperStudioEmbedded ? HYPER_STUDIO_REPOSITORY : 'https://github.com/Comfy-Org/ComfyUI_frontend',
    githubElectron: isHyperStudioEmbedded ? HYPER_STUDIO_REPOSITORY : 'https://github.com/Comfy-Org/electron',
    forum: isHyperStudioEmbedded ? `${HYPER_STUDIO_REPOSITORY}/issues` : 'https://forum.comfy.org/',
    comfyOrg: isHyperStudioEmbedded ? HYPER_STUDIO_REPOSITORY : 'https://comfy.org/',
    status: isHyperStudioEmbedded ? HYPER_STUDIO_REPOSITORY : 'https://status.comfy.org/'
  }

  /** Common doc paths for use with buildDocsUrl */
  const docsPaths = {
    partnerNodesPricing: '/tutorials/partner-nodes/pricing'
  }

  return {
    buildDocsUrl,
    staticUrls,
    docsPaths
  }
}

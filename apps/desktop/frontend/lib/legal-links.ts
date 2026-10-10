import { openExternalBrowserUrl } from '@/components/home/home-external-links'

/** LTX-2 Community License — same URL the catalog and Home already use. */
export const LTX_COMMUNITY_LICENSE_URL =
  'https://github.com/Lightricks/LTX-2/blob/main/LICENSE'

export function openLegalUrl(url: string): void {
  openExternalBrowserUrl(url)
}

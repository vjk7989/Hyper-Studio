import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { Plugin } from 'vite'

const DESIGN_SYSTEM_STYLE_SUFFIX =
  '/packages/design-system/src/css/style.css'
const TEMPLATE_DISPLAY_SUFFIX =
  '/src/platform/workflow/templates/utils/templateDisplay.ts'
const INHERITED_ICON_SAFELIST =
  /(icon(?:-mask)?-\[comfy--\{)([^}]+)(\}\])/g
const SOURCE_MAP_REFERENCE =
  /(?:^[\t ]*\/\/[#@]\s*sourceMappingURL=.*$|\/\*[#@]\s*sourceMappingURL=[^*]*\*\/[\t ]*$)/gm
const EMBEDDED_PROMO_ASSET_PATHS = [
  'assets/images/partner-nodes-signin.webp'
] as const

export function stripInheritedIconSafelist(source: string): string {
  return source.replace(
    INHERITED_ICON_SAFELIST,
    (_match, prefix: string, names: string, suffix: string) => {
      const retained = names
        .split(',')
        .filter((name) => name !== 'comfy-cloud' && name !== 'comfy-logo')
      return `${prefix}${retained.join(',')}${suffix}`
    }
  )
}

export function excludeInheritedIconsFromTemplateGlob(source: string): string {
  return source.replace(
    /import\.meta\.glob\(\s*(['"])(\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/packages\/design-system\/src\/icons\/\*\.svg)\1\s*,/,
    (_match, quote: string, glob: string) => {
      const iconDirectory = glob.slice(0, -'*.svg'.length)
      return `import.meta.glob([\n  ${quote}${glob}${quote},\n  ${quote}!${iconDirectory}comfy-cloud.svg${quote},\n  ${quote}!${iconDirectory}comfy-logo.svg${quote}\n],`
    }
  )
}

export function stripSourceMapReferences(source: string): string {
  return source.replace(SOURCE_MAP_REFERENCE, '')
}

type BundleItem =
  | { type: 'chunk'; code: string }
  | { type: 'asset'; source: string | Uint8Array }

function stripBundleSourceMapReferences(bundle: Record<string, BundleItem>) {
  for (const item of Object.values(bundle)) {
    if (item.type === 'chunk') {
      item.code = stripSourceMapReferences(item.code)
      continue
    }

    if (typeof item.source === 'string') {
      item.source = stripSourceMapReferences(item.source)
    }
  }
}

export async function removeEmbeddedPromoAssets(outputDirectory: string) {
  await Promise.all(
    EMBEDDED_PROMO_ASSET_PATHS.map((relativePath) =>
      rm(resolve(outputDirectory, relativePath), { force: true })
    )
  )
}

export function hyperStudioEmbeddedOutputPlugin(enabled: boolean): Plugin {
  return {
    name: 'hyper-studio-embedded-output-hygiene',
    enforce: 'pre',
    transform(source, id) {
      const sourcePath = id.replaceAll('\\', '/').split('?', 1)[0]
      if (!enabled) return null

      const code = sourcePath.endsWith(DESIGN_SYSTEM_STYLE_SUFFIX)
        ? stripInheritedIconSafelist(source)
        : sourcePath.endsWith(TEMPLATE_DISPLAY_SUFFIX)
          ? excludeInheritedIconsFromTemplateGlob(source)
          : source
      return code === source ? null : { code, map: null }
    },
    generateBundle(_options, bundle) {
      if (enabled) {
        stripBundleSourceMapReferences(
          bundle as unknown as Record<string, BundleItem>
        )
      }
    },
    async writeBundle(options) {
      if (enabled && options.dir) {
        await removeEmbeddedPromoAssets(options.dir)
      }
    }
  }
}

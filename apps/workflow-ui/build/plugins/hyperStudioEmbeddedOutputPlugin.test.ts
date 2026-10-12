import { randomUUID } from 'node:crypto'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  excludeInheritedIconsFromTemplateGlob,
  hyperStudioEmbeddedOutputPlugin,
  removeEmbeddedPromoAssets,
  stripInheritedIconSafelist,
  stripSourceMapReferences
} from './hyperStudioEmbeddedOutputPlugin'

describe('hyperStudioEmbeddedOutputPlugin', () => {
  it('removes inherited product icons from both design-system safelists', () => {
    const source = `
@source inline("icon-[comfy--{claude,comfy-cloud,comfy-logo,credits}]");
@source inline("icon-mask-[comfy--{comfy-logo,depth-to-image,workflow}]");`

    expect(stripInheritedIconSafelist(source)).toBe(`
@source inline("icon-[comfy--{claude,credits}]");
@source inline("icon-mask-[comfy--{depth-to-image,workflow}]");`)
  })

  it('removes line and block source-map references from emitted text', () => {
    const source = [
      'const first = true',
      '//# sourceMappingURL=vendor.js.map',
      'const second = true /*# sourceMappingURL=data:application/json;base64,AAAA */'
    ].join('\n')

    expect(stripSourceMapReferences(source)).toBe(
      ['const first = true', '', 'const second = true '].join('\n')
    )
  })

  it('excludes inherited product icons from the template icon glob', () => {
    const source = `const iconFiles = import.meta.glob(
  '../../../../../packages/design-system/src/icons/*.svg',
  { query: '?raw' }
)`

    expect(excludeInheritedIconsFromTemplateGlob(source)).toBe(`const iconFiles = import.meta.glob([
  '../../../../../packages/design-system/src/icons/*.svg',
  '!../../../../../packages/design-system/src/icons/comfy-cloud.svg',
  '!../../../../../packages/design-system/src/icons/comfy-logo.svg'
],
  { query: '?raw' }
)`)
  })

  it('leaves upstream builds unchanged', () => {
    const plugin = hyperStudioEmbeddedOutputPlugin(false)
    const transform = plugin.transform
    if (typeof transform !== 'function') {
      throw new Error('Expected a transform hook')
    }

    expect(
      transform.call(
        {} as never,
        '@source inline("icon-[comfy--{comfy-cloud,node}]");',
        '/repo/packages/design-system/src/css/style.css'
      )
    ).toBeNull()
  })

  it('strips inherited icons when Vite adds a CSS query', () => {
    const plugin = hyperStudioEmbeddedOutputPlugin(true)
    const transform = plugin.transform
    if (typeof transform !== 'function') {
      throw new Error('Expected a transform hook')
    }

    expect(
      transform.call(
        {} as never,
        '@source inline("icon-[comfy--{comfy-cloud,node}]");',
        'G:/repo/packages/design-system/src/css/style.css?direct'
      )
    ).toEqual({
      code: '@source inline("icon-[comfy--{node}]");',
      map: null
    })
  })

  it('removes inherited sign-in promotion assets from embedded output', async () => {
    const outputDirectory = resolve(
      process.cwd(),
      '../../.local-tmp',
      `embedded-output-plugin-${randomUUID()}`
    )
    const promoAsset = resolve(
      outputDirectory,
      'assets/images/partner-nodes-signin.webp'
    )
    const retainedAsset = resolve(outputDirectory, 'assets/images/local.webp')
    try {
      await mkdir(resolve(outputDirectory, 'assets/images'), {
        recursive: true
      })
      await writeFile(promoAsset, 'inherited promotion')
      await writeFile(retainedAsset, 'local asset')

      await removeEmbeddedPromoAssets(outputDirectory)

      await expect(access(promoAsset)).rejects.toThrow()
      await expect(access(retainedAsset)).resolves.toBeUndefined()
    } finally {
      await rm(outputDirectory, { recursive: true, force: true })
    }
  })
})

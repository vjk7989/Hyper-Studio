import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const splashScript = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]

function initialSplash(stored: Record<string, string> = {}) {
  const properties: Record<string, string> = {}
  const splash = { style: { background: '', color: '' } }
  expect(splashScript).toBeDefined()
  runInNewContext(splashScript!, {
    window: { matchMedia: () => ({ matches: false }) },
    localStorage: { getItem: (key: string) => stored[key] ?? null },
    document: {
      documentElement: { style: { setProperty: (key: string, value: string) => { properties[key] = value } } },
      getElementById: () => splash
    }
  })
  return { properties, splash }
}

describe('workflow splash theme', () => {
  it('starts dark even when the operating system prefers Light', () => {
    const { properties, splash } = initialSplash()
    expect(properties['--bg-color']).toBe('#202020')
    expect(properties['--fg-color']).toBe('#ffffff')
    expect(splash.style.background).toBe('#202020')
  })

  it('uses a saved Light palette without a dark splash', () => {
    const { properties, splash } = initialSplash({
      'hyper-studio-splash-bg': '#FFFFFF',
      'hyper-studio-splash-fg': '#000000'
    })
    expect(properties['--bg-color']).toBe('#FFFFFF')
    expect(splash.style.color).toBe('#000000')
  })

  it('reads the palette keys that the canvas writes', () => {
    const service = readFileSync(resolve(process.cwd(), 'src/services/colorPaletteService.ts'), 'utf8')
    expect(service).toContain("localStorage.setItem('hyper-studio-splash-bg'")
    expect(service).toContain("localStorage.setItem('hyper-studio-splash-fg'")
  })
})

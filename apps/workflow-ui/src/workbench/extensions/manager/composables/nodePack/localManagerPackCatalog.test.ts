import { describe, expect, it } from 'vitest'

import { localManagerPacksForIds } from './localManagerPackCatalog'

describe('local managed node-pack catalog', () => {
  it('resolves a reviewed source without an upstream registry request', () => {
    const packs = localManagerPacksForIds({
      node_packs: {
        'comfyui-impact-pack': {
          title: 'ComfyUI Impact Pack',
          files: ['https://github.com/ltdrdata/ComfyUI-Impact-Pack']
        }
      }
    }, ['comfyui-impact-pack'])

    expect(packs).toEqual([expect.objectContaining({
      id: 'comfyui-impact-pack',
      name: 'ComfyUI Impact Pack',
      repository: 'https://github.com/ltdrdata/ComfyUI-Impact-Pack',
      hyperStudioLocalCatalog: true,
      hyperStudioManagerPackId: 'comfyui-impact-pack'
    })])
  })

  it('keeps missing or unsafe sources on the Search path', () => {
    expect(localManagerPacksForIds({ node_packs: {
      missing: { title: 'Missing source' },
      unsafe: { repository: 'http://127.0.0.1/private' }
    } }, ['missing', 'unsafe', 'unknown'])).toEqual([])
  })
})

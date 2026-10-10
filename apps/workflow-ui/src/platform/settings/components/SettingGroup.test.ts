import { render, screen } from '@testing-library/vue'
import { afterEach, expect, it, vi } from 'vitest'

import { i18n } from '@/i18n'

import SettingGroup from './SettingGroup.vue'

const embedded = vi.hoisted(() => ({ value: false }))

vi.mock(import('@/platform/distribution/hyperStudio'), () => ({
  get isHyperStudioEmbedded() {
    return embedded.value
  }
}))

afterEach(() => {
  embedded.value = false
})

it.for([
  [false, 'Comfy'],
  [true, 'Hyper-Studio']
])('shows the embedded category as %s', ([isEmbedded, label]) => {
  embedded.value = isEmbedded

  render(SettingGroup, {
    props: {
      group: { category: 'Comfy', label: 'Nodes 2.0', settings: [] }
    },
    global: {
      plugins: [i18n],
      stubs: { SettingItem: true }
    }
  })

  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
    `${label} › Nodes 2.0`
  )
})

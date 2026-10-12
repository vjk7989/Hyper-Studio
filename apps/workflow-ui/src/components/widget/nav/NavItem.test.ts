import { fireEvent, render, screen } from '@testing-library/vue'
import { expect, it, vi } from 'vitest'

import NavItem from './NavItem.vue'

it('can activate navigation from keyboard focus', async () => {
  const onClick = vi.fn()
  render(NavItem, {
    props: { icon: 'icon-[lucide--settings]', onClick },
    slots: { default: 'Extension' }
  })

  const item = screen.getByRole('button', { name: 'Extension' })
  expect(item).toHaveAttribute('tabindex', '0')
  item.focus()
  expect(document.activeElement).toBe(item)

  await fireEvent.keyDown(item, { key: 'Enter' })
  await fireEvent.keyDown(item, { key: ' ' })
  expect(onClick).toHaveBeenCalledTimes(2)
})

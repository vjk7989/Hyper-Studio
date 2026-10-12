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

it('does not forward activation keys to parent canvas shortcuts', async () => {
  const onClick = vi.fn()
  const parentKeydown = vi.fn()
  const { container } = render(NavItem, {
    props: { icon: 'icon-[lucide--settings]', onClick },
    slots: { default: 'Extension' }
  })
  container.addEventListener('keydown', parentKeydown)

  const item = screen.getByRole('button', { name: 'Extension' })
  await fireEvent.keyDown(item, { key: 'Enter' })
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(parentKeydown).not.toHaveBeenCalled()
  await fireEvent.keyDown(item, { key: ' ' })

  expect(onClick).toHaveBeenCalledTimes(2)
  expect(parentKeydown).not.toHaveBeenCalled()
})

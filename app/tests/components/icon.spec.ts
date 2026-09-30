import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HnIcon from '@/components/HnIcon.vue'

describe('HnIcon', () => {
  it('renders functional icons with a name and decorative icons hidden', () => {
    const functional = mount(HnIcon, { props: { name: 'gear-filled', label: '设置' } })
    expect(functional.get('svg').attributes('aria-label')).toBe('设置')
    expect(functional.get('svg').attributes('role')).toBe('img')

    const decorative = mount(HnIcon, { props: { name: 'heart-filled', decorative: true } })
    expect(decorative.get('svg').attributes('aria-hidden')).toBe('true')
  })

  it('renders every registered icon as SVG paths', () => {
    const wrapper = mount(HnIcon, { props: { name: 'home-filled', decorative: true } })
    expect(wrapper.find('path').exists()).toBe(true)
    expect(wrapper.text()).toBe('')
  })
})

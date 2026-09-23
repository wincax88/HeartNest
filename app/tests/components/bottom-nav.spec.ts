import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HnBottomNav from '@/components/HnBottomNav.vue'

describe('HnBottomNav', () => {
  it('emits the selected destination', async () => {
    const wrapper = mount(HnBottomNav, { props: { active: 'home' } })
    await wrapper.get('[data-testid="nav-review"]').trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['review'])
  })

  it('marks the active destination', () => {
    const wrapper = mount(HnBottomNav, { props: { active: 'profile' } })
    expect(wrapper.get('[data-testid="nav-profile"]').classes()).toContain('is-active')
  })
})

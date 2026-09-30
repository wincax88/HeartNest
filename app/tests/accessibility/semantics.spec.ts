import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HnBottomNav from '@/components/HnBottomNav.vue'
import MoodSelector from '@/components/MoodSelector.vue'

const moods = [
  { id: 'calm', title: '平静', icon: 'cloud-filled' },
  { id: 'happy', title: '开心', icon: 'heart-filled' },
] as any

describe('control semantics', () => {
  it('exposes bottom navigation as tabs with one selected item', () => {
    const wrapper = mount(HnBottomNav, { props: { active: 'home' } })
    expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBe('主导航')
    expect(wrapper.findAll('[role="tab"]').filter((node) => node.attributes('aria-selected') === 'true')).toHaveLength(1)
  })

  it('exposes moods as a labeled single-select group', () => {
    const wrapper = mount(MoodSelector, { props: { items: moods, modelValue: 'calm' } })
    expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('此刻心情')
    expect(wrapper.get('[aria-checked="true"]').text()).toContain('平静')
  })

  it('supports keyboard activation', async () => {
    const nav = mount(HnBottomNav, { props: { active: 'home' } })
    await nav.get('[data-testid="nav-review"]').trigger('keydown', { key: 'Enter' })
    expect(nav.emitted('navigate')?.[0]).toEqual(['review'])
  })
})

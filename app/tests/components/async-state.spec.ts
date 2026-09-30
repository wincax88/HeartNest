import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HnAsyncState from '@/components/HnAsyncState.vue'

describe('HnAsyncState', () => {
  it.each(['loading', 'error', 'offline', 'empty'] as const)('announces %s state', (state) => {
    const wrapper = mount(HnAsyncState, { props: { state, title: '状态标题', actionLabel: '重试' } })
    expect(wrapper.get('[role="status"]').text()).toContain('状态标题')
    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe(state === 'error' ? 'assertive' : 'polite')
  })

  it('emits one recovery action', async () => {
    const wrapper = mount(HnAsyncState, { props: { state: 'error', title: '加载失败', actionLabel: '重试' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })
})

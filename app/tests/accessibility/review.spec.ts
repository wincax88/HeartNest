import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import ReviewPage from '@/pages/review/index.vue'

describe('review data accessibility', () => {
  it('provides a text summary and one data row per review day', async () => {
    vi.stubGlobal('uni', { reLaunch: vi.fn(), showToast: vi.fn() })
    const wrapper = mount(ReviewPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    expect(wrapper.get('[data-testid="review-summary"]').text()).toContain('近 7 天')
    expect(wrapper.findAll('[data-testid="review-data-row"]')).toHaveLength(7)
  })
})

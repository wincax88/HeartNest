import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReviewPage from '@/pages/review/index.vue'
import { useReviewStore } from '@/stores/review'
import { api } from '@/services/api'

describe('review interactions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-01T12:00:00'))
    vi.stubGlobal('uni', { reLaunch: vi.fn(), showToast: vi.fn() })
  })

  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  async function render() {
    const pinia = createPinia()
    const wrapper = mount(ReviewPage, { global: { plugins: [pinia] } })
    await flushPromises()
    return { wrapper, store: useReviewStore(pinia) }
  }

  it('keeps filters collapsed and defaults to the current seven days', async () => {
    const { wrapper } = await render()
    expect(wrapper.find('[data-testid="apply-review-filter"]').exists()).toBe(false)
    await wrapper.get('[data-testid="toggle-review-filter"]').trigger('click')
    expect(wrapper.get('[data-testid="review-filter-from"]').attributes('value')).toBe('2026-09-25')
    expect(wrapper.get('[data-testid="review-filter-to"]').attributes('value')).toBe('2026-10-01')
    expect(wrapper.get('[data-testid="review-filter-mood"]').attributes('range')).toContain('有点焦虑')
  })

  it('shows the selected day and distinguishes missing records', async () => {
    const { wrapper, store } = await render()
    store.reviewDays[0] = { ...store.reviewDays[0], recorded: false, summary: '' }
    store.reviewDays[1] = { ...store.reviewDays[1], label: '有点累', summary: '今天想早点休息' }
    await wrapper.vm.$nextTick()
    await wrapper.findAll('[data-testid="review-day"]')[1].trigger('click')
    expect(wrapper.get('[data-testid="review-day-detail"]').text()).toContain('今天想早点休息')
    expect(wrapper.findAll('[data-testid="review-day"]')[1].attributes('aria-pressed')).toBe('true')
    await wrapper.findAll('[data-testid="review-day"]')[0].trigger('click')
    expect(wrapper.get('[data-testid="review-day-detail"]').text()).toContain('未记录')
    expect(wrapper.get('[data-testid="review-day-detail"]').text()).not.toContain('平静')
  })

  it('uses the catalog mood id and displays returned records', async () => {
    const getReview = vi.spyOn(api, 'getReview').mockResolvedValueOnce([
      { id: 'record-1', moodId: 'anxious', summary: '明天的事让我有些担心', recordedAt: '2026-09-30T12:00:00Z' },
    ])
    const { wrapper } = await render()
    await wrapper.get('[data-testid="toggle-review-filter"]').trigger('click')
    await wrapper.get('[data-testid="review-filter-mood"]').trigger('change', { detail: { value: '3' } })
    await wrapper.get('[data-testid="apply-review-filter"]').trigger('click')
    await flushPromises()
    expect(getReview).toHaveBeenCalledWith({ from: '2026-09-25', to: '2026-10-01', mood: 'anxious' })
    expect(wrapper.get('[data-testid="filtered-review-record"]').text()).toContain('明天的事让我有些担心')
    expect(wrapper.get('[data-testid="filtered-review-record"]').text()).toContain('有点焦虑')
    expect(wrapper.get('[data-testid="toggle-review-filter"]').attributes('aria-expanded')).toBe('false')
  })

  it('rejects a reversed date range without requesting records', async () => {
    const getReview = vi.spyOn(api, 'getReview')
    const { wrapper } = await render()
    await wrapper.get('[data-testid="toggle-review-filter"]').trigger('click')
    await wrapper.get('[data-testid="review-filter-from"]').trigger('change', { detail: { value: '2026-10-02' } })
    await wrapper.get('[data-testid="apply-review-filter"]').trigger('click')
    expect(getReview).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="review-filter-error"]').text()).toContain('开始日期不能晚于结束日期')
  })

  it('prevents duplicate requests while filtering and offers recovery for no matches', async () => {
    let resolveRequest!: (records: Awaited<ReturnType<typeof api.getReview>>) => void
    const getReview = vi.spyOn(api, 'getReview').mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve }))
    const { wrapper } = await render()
    await wrapper.get('[data-testid="toggle-review-filter"]').trigger('click')
    await wrapper.get('[data-testid="apply-review-filter"]').trigger('click')
    expect(wrapper.get('[data-testid="apply-review-filter"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="apply-review-filter"]').trigger('click')
    expect(getReview).toHaveBeenCalledTimes(1)
    resolveRequest([])
    await flushPromises()
    expect(wrapper.get('[data-testid="review-filter-results"]').text()).toContain('没有符合条件的记录')
    await wrapper.get('.adjust-filter').trigger('click')
    expect(wrapper.find('[data-testid="apply-review-filter"]').exists()).toBe(true)
  })

  it('keeps failed filters open with a readable error', async () => {
    vi.spyOn(api, 'getReview').mockRejectedValueOnce(new Error('无法连接服务器'))
    const { wrapper } = await render()
    await wrapper.get('[data-testid="toggle-review-filter"]').trigger('click')
    await wrapper.get('[data-testid="apply-review-filter"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="review-filter-error"]').text()).toBe('无法连接服务器')
    expect(wrapper.get('[data-testid="apply-review-filter"]').attributes('disabled')).toBeUndefined()
  })

  it('shows a load error instead of an empty history and allows retry', async () => {
    vi.spyOn(api, 'bootstrap').mockRejectedValueOnce(new Error('无法连接服务器'))
    const { wrapper } = await render()
    expect(wrapper.text()).toContain('暂时没能加载回顾')
    expect(wrapper.find('[data-testid="review-empty"]').exists()).toBe(false)
    await wrapper.get('.async-state__action').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="review-day"]')).toHaveLength(7)
  })

  it('does not flash empty history while the first load is pending', async () => {
    vi.spyOn(api, 'bootstrap').mockReturnValueOnce(new Promise(() => {}))
    const { wrapper } = await render()
    expect(wrapper.text()).toContain('正在整理你的情绪记录')
    expect(wrapper.find('[data-testid="review-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="review-day"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

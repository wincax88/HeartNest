import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsPage from '@/pages/settings/index.vue'
import { api } from '@/services/api'
import { useProfileStore } from '@/stores/profile'
import { useBootstrapStore } from '@/stores/bootstrap'

describe('settings preferences and recovery', () => {
  beforeEach(() => {
    vi.stubGlobal('uni', { navigateTo: vi.fn(), navigateBack: vi.fn(), reLaunch: vi.fn(), showToast: vi.fn(), showActionSheet: vi.fn(), showModal: vi.fn() })
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  async function render(pinia = createPinia()) {
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    await flushPromises()
    return { wrapper, store: useProfileStore(pinia), pinia }
  }

  it('waits for persisted preferences before showing a switch state', async () => {
    vi.spyOn(api, 'bootstrap').mockReturnValueOnce(new Promise(() => {}))
    const { wrapper } = await render()
    expect(wrapper.text()).toContain('正在载入你的设置')
    expect(wrapper.find('[data-testid="memory-prompt-toggle"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('offers retry after loading fails', async () => {
    vi.spyOn(api, 'bootstrap').mockRejectedValueOnce(new Error('无法连接服务器'))
    const { wrapper } = await render()
    expect(wrapper.text()).toContain('暂时没能加载设置')
    expect(wrapper.find('[data-testid="memory-prompt-toggle"]').exists()).toBe(false)
    await wrapper.get('.async-state__action').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="memory-prompt-toggle"]').attributes('aria-checked')).toBe('true')
  })

  it('exposes switch state, prevents overlapping preference saves and confirms success', async () => {
    const { wrapper } = await render()
    let finish!: (value: Awaited<ReturnType<typeof api.updatePreferences>>) => void
    vi.spyOn(api, 'updatePreferences').mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const toggle = wrapper.get('[data-testid="memory-prompt-toggle"]')
    expect(toggle.attributes('role')).toBe('switch')
    await toggle.trigger('keydown', { key: ' ' })
    expect(toggle.attributes('aria-checked')).toBe('false')
    expect(toggle.attributes('aria-disabled')).toBe('true')
    expect(wrapper.text()).toContain('正在保存偏好')
    await toggle.trigger('click')
    await wrapper.get('[data-testid="reply-style-row"]').trigger('click')
    expect(api.updatePreferences).toHaveBeenCalledOnce()
    expect(uni.showActionSheet).not.toHaveBeenCalled()
    finish({ notificationsEnabled: true, replyStyle: 'gentle', memoryPromptsEnabled: false, onboardingCompleted: false })
    await flushPromises()
    expect(toggle.attributes('aria-disabled')).toBe('false')
    expect(wrapper.text()).toContain('你的偏好已保存')
  })

  it('restores the switch after failure and retries the intended value', async () => {
    const { wrapper, store } = await render()
    vi.spyOn(api, 'updatePreferences').mockRejectedValueOnce(new Error('保存服务暂时不可用'))
    await wrapper.get('[data-testid="memory-prompt-toggle"]').trigger('click')
    await flushPromises()
    expect(store.preferences.memoryPromptsEnabled).toBe(true)
    expect(wrapper.text()).toContain('设置未保存，已恢复原状态')
    await wrapper.get('.async-state__action').trigger('click')
    await flushPromises()
    expect(api.updatePreferences).toHaveBeenNthCalledWith(2, { memoryPromptsEnabled: false })
    expect(store.preferences.memoryPromptsEnabled).toBe(false)
    expect(wrapper.text()).not.toContain('这次设置没能保存')
  })

  it('marks the selected reply style and saves a new selection', async () => {
    const { wrapper, store } = await render()
    await wrapper.get('[data-testid="reply-style-row"]').trigger('keydown', { key: 'Enter' })
    const options = vi.mocked(uni.showActionSheet).mock.calls[0][0]!
    expect(options.itemList[0]).toBe('温柔接纳（当前）')
    options.success!({ tapIndex: 2 })
    options.complete!({ errMsg: 'showActionSheet:ok' })
    await flushPromises()
    expect(store.preferences.replyStyle).toBe('reflective')
    expect(wrapper.get('[data-testid="reply-style-row"]').text()).toContain('轻柔复盘')
    await wrapper.get('[data-testid="reply-style-row"]').trigger('click')
    const cancelled = vi.mocked(uni.showActionSheet).mock.calls[1][0]!
    cancelled.fail!({ errMsg: 'showActionSheet:fail cancel' })
    cancelled.complete!({ errMsg: 'showActionSheet:fail cancel' })
    expect(api.updatePreferences).toHaveBeenCalledOnce()
    expect(uni.showToast).not.toHaveBeenCalled()
  })

  it('keeps account actions in the second group and describes account-based storage', async () => {
    const { wrapper } = await render()
    expect(wrapper.findAll('.settings-group')[0].text()).not.toContain('账号与隐私')
    await wrapper.get('[data-testid="account-row"]').trigger('keydown', { key: 'Enter' })
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/pages/account/index' })
    await wrapper.get('[data-testid="notification-settings-row"]').trigger('keydown', { key: ' ' })
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/pages/notification-settings/index' })
    await wrapper.get('[data-testid="local-data-row"]').trigger('click')
    const content = vi.mocked(uni.showModal).mock.calls[0][0]!.content!
    expect(content).toContain('关联当前账号')
    expect(content).toContain('DeepSeek')
    expect(content).not.toContain('匿名标识')
  })

  it('preserves feedback text after failure and guards duplicate submissions', async () => {
    const { wrapper } = await render()
    let fail!: (error: Error) => void
    vi.spyOn(api, 'submitFeedback').mockReturnValueOnce(new Promise((_, reject) => { fail = reject }))
    await wrapper.get('[data-testid="help-feedback-row"]').trigger('click')
    await wrapper.get('[data-testid="help-feedback-row"]').trigger('click')
    expect(uni.showModal).toHaveBeenCalledOnce()
    const modal = vi.mocked(uni.showModal).mock.calls[0][0]!
    modal.success!({ confirm: true, cancel: false, content: '  希望提醒更灵活  ' })
    modal.complete!({ errMsg: 'showModal:ok' })
    await flushPromises()
    await wrapper.get('[data-testid="help-feedback-row"]').trigger('click')
    expect(api.submitFeedback).toHaveBeenCalledWith('希望提醒更灵活')
    expect(uni.showModal).toHaveBeenCalledOnce()
    fail(new Error('暂时未能提交'))
    await flushPromises()
    await wrapper.get('[data-testid="help-feedback-row"]').trigger('click')
    expect(vi.mocked(uni.showModal).mock.calls[1][0]!.content).toBe('希望提醒更灵活')
  })

  it('keeps cached preferences visible offline and prevents writes', async () => {
    const pinia = createPinia()
    useBootstrapStore(pinia).hydrate(await api.bootstrap())
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { wrapper } = await render(pinia)
    expect(wrapper.text()).toContain('正在查看已缓存的设置')
    expect(wrapper.get('[data-testid="memory-prompt-toggle"]').attributes('aria-disabled')).toBe('true')
    await wrapper.get('[data-testid="memory-prompt-toggle"]').trigger('click')
    await wrapper.get('[data-testid="reply-style-row"]').trigger('keydown', { key: 'Enter' })
    expect(api.updatePreferences).not.toHaveBeenCalled()
    expect(uni.showActionSheet).not.toHaveBeenCalled()
  })

  it('returns direct-entry visitors to their profile', async () => {
    vi.stubGlobal('getCurrentPages', () => [{}])
    const { wrapper } = await render()
    await wrapper.get('[data-testid="settings-back"]').trigger('keydown', { key: 'Enter' })
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/profile/index' })
  })
})

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatPage from '@/pages/chat/index.vue'
import CompanionPage from '@/pages/companion/index.vue'

describe('companion and chat pages', () => {
  const navigateTo = vi.fn()

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    navigateTo.mockReset()
    vi.stubGlobal('uni', { navigateTo, navigateBack: vi.fn(), showToast: vi.fn() })
  })

  it('opens Mika chat from the companion profile', async () => {
    const wrapper = mount(CompanionPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    await wrapper.get('[data-testid="profile-chat"]').trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/chat/index?id=mika' })
  })

  it('sends text and renders the companion reply', async () => {
    const wrapper = mount(ChatPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    await wrapper.get('[data-testid="chat-input"]').setValue('今天有点累')
    await wrapper.get('[data-testid="chat-send"]').trigger('click')
    expect(wrapper.text()).toContain('正在回应')
    await flushPromises()
    expect(wrapper.text()).toContain('撑了很久')
    expect(wrapper.text()).not.toContain('发送中')
  })

  it('does not send blank input', async () => {
    const wrapper = mount(ChatPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    await wrapper.get('[data-testid="chat-send"]').trigger('click')
    expect(wrapper.findAll('[data-testid="chat-message"]')).toHaveLength(0)
  })
})

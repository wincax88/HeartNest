import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatPage from '@/pages/chat/index.vue'
import CompanionPage from '@/pages/companion/index.vue'
import { useAppStore } from '@/stores/app'
import { useBootstrapStore } from '@/stores/bootstrap'
import { apiMock } from '../setup'

const pageRoute = vi.hoisted(() => ({ options: {} as Record<string, string> }))

vi.mock('@dcloudio/uni-app', async () => {
  const { onBeforeMount } = await import('vue')
  return { onLoad: (hook: (options: Record<string, string>) => void) => onBeforeMount(() => hook(pageRoute.options)) }
})

describe('companion and chat pages', () => {
  const navigateTo = vi.fn()

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    navigateTo.mockReset()
    pageRoute.options = {}
    vi.stubGlobal('getCurrentPages', () => [{ options: { id: 'mika' } }])
    vi.stubGlobal('uni', { navigateTo, navigateBack: vi.fn(), showToast: vi.fn() })
  })

  it('opens Mika chat from the companion profile', async () => {
    const wrapper = mount(CompanionPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    await wrapper.get('[data-testid="profile-chat"]').trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/chat/index?id=mika' })
  })

  it.each(['luna', 'aiden'] as const)('opens the requested %s profile after bootstrap restores Mika', async (id) => {
    pageRoute.options = { id }
    const pinia = createPinia()
    const wrapper = mount(CompanionPage, { global: { plugins: [pinia] } })
    await flushPromises()

    expect(wrapper.get('.profile-name').text().toLowerCase()).toBe(id)
    expect(useAppStore(pinia).selectedCompanionId).toBe(id)
    expect(apiMock.updateState).toHaveBeenCalledWith({ selectedCompanionId: id })
    await wrapper.get('[data-testid="profile-chat"]').trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: `/pages/chat/index?id=${id}` })
  })

  it.each(['luna', 'aiden'] as const)('loads and sends to %s from the page load query', async (id) => {
    pageRoute.options = { id }
    const wrapper = mount(ChatPage, { global: { plugins: [createPinia()] } })
    await flushPromises()

    expect(wrapper.get('.header-avatar').attributes('src')).toContain(`${id}-card.jpg`)
    expect(wrapper.get('.companion-note').text().toLowerCase()).toContain(id)
    expect(apiMock.getChat).toHaveBeenCalledWith(id)
    await wrapper.get('[data-testid="chat-input"]').setValue('今天有点累')
    await wrapper.get('[data-testid="chat-send"]').trigger('click')
    await flushPromises()
    expect(apiMock.sendMessage).toHaveBeenCalledWith(id, expect.objectContaining({ text: '今天有点累' }))
  })

  it.each([undefined, 'unknown'])('uses the selected companion when the query is %s', async (id) => {
    pageRoute.options = id ? { id } : {}
    const pinia = createPinia()
    await useBootstrapStore(pinia).initialize()
    await useAppStore(pinia).selectCompanion('luna')
    mount(ChatPage, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(apiMock.getChat).toHaveBeenCalledWith('luna')
  })

  it('waits for bootstrap already started by the app before loading the requested chat', async () => {
    pageRoute.options = { id: 'aiden' }
    const data = await apiMock.bootstrap()
    let finishBootstrap!: (value: typeof data) => void
    apiMock.bootstrap.mockImplementationOnce(() => new Promise(resolve => { finishBootstrap = resolve }))
    const pinia = createPinia()
    const initializing = useBootstrapStore(pinia).initialize()
    const wrapper = mount(ChatPage, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(apiMock.getChat).not.toHaveBeenCalled()

    finishBootstrap(data)
    await initializing
    await flushPromises()
    expect(apiMock.getChat).toHaveBeenCalledWith('aiden')
    expect(wrapper.get('.companion-note').text()).toContain('Aiden')
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

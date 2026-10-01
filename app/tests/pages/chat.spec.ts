import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatPage from '@/pages/chat/index.vue'
import CompanionPage from '@/pages/companion/index.vue'
import { useAppStore } from '@/stores/app'
import { useBootstrapStore } from '@/stores/bootstrap'
import { useChatStore } from '@/stores/chat'
import { useProfileStore } from '@/stores/profile'
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

  it('keeps the next draft while a companion reply is pending', async () => {
    const response = await apiMock.sendMessage('mika', { text: '第一句话', clientMessageId: 'first' })
    let finish!: (value: typeof response) => void
    apiMock.sendMessage.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = mount(ChatPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    const input = wrapper.get('[data-testid="chat-input"]')
    await input.setValue('第一句话')
    await wrapper.get('[data-testid="chat-send"]').trigger('click')
    expect((input.element as HTMLTextAreaElement).value).toBe('')
    expect(input.attributes('disabled')).toBeUndefined()
    await input.setValue('下一句话')
    finish(response)
    await flushPromises()
    expect((input.element as HTMLTextAreaElement).value).toBe('下一句话')
  })

  it('respects Chinese composition and Shift+Enter before sending with Enter', async () => {
    const wrapper = mount(ChatPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    const input = wrapper.get('[data-testid="chat-input"]')
    await input.setValue('还在输入')
    await input.trigger('keydown', { key: 'Enter', isComposing: true })
    await input.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(apiMock.sendMessage).not.toHaveBeenCalled()
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(apiMock.sendMessage).toHaveBeenCalledOnce()
  })

  it('offers an actionable history load error and reloads the conversation', async () => {
    apiMock.getChat.mockRejectedValueOnce(new Error('暂时无法读取历史'))
    const wrapper = mount(ChatPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    expect(wrapper.text()).toContain('对话暂时没能加载')
    expect(wrapper.get('[data-testid="chat-send"]').attributes('disabled')).toBeDefined()
    await wrapper.get('.async-state button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="chat-empty"]').exists()).toBe(true)
  })

  it('honors memory preferences and prevents duplicate memory saves', async () => {
    const pinia = createPinia()
    const wrapper = mount(ChatPage, { global: { plugins: [pinia] } })
    await flushPromises()
    useChatStore(pinia).messages = [{ id: 'remember-me', sender: 'user', content: '这一刻值得记住', createdAt: new Date().toISOString(), status: 'sent' }]
    useProfileStore(pinia).preferences.memoryPromptsEnabled = false
    await flushPromises()
    expect(wrapper.find('[data-testid="memory-prompt"]').exists()).toBe(false)
    useProfileStore(pinia).preferences.memoryPromptsEnabled = true
    await flushPromises()
    expect(wrapper.get('[data-testid="memory-prompt"]').text()).toContain('这一刻值得记住')
    const memory = await apiMock.saveMemory('mika', 'remember-me')
    apiMock.saveMemory.mockClear()
    let finish!: (value: typeof memory) => void
    apiMock.saveMemory.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await wrapper.get('[data-testid="save-memory"]').trigger('click')
    await wrapper.get('[data-testid="save-memory"]').trigger('click')
    expect(apiMock.saveMemory).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('保存中…')
    finish(memory)
    await flushPromises()
    expect(wrapper.text()).toContain('这句话已记住')
    expect(wrapper.get('[data-testid="save-memory"]').attributes('disabled')).toBeDefined()
    useChatStore(pinia).messages.push({ id: 'next-memory', sender: 'user', content: '新的一句话', createdAt: new Date().toISOString(), status: 'sent' })
    await flushPromises()
    expect(wrapper.get('[data-testid="save-memory"]').attributes('disabled')).toBeUndefined()
  })

  it('restores a failed send for editing and retries its existing message', async () => {
    apiMock.sendMessage.mockRejectedValueOnce(new Error('发送暂未成功'))
    const wrapper = mount(ChatPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    await wrapper.get('[data-testid="chat-input"]').setValue('想再试一次')
    await wrapper.get('[data-testid="chat-send"]').trigger('click')
    await flushPromises()
    expect((wrapper.get('[data-testid="chat-input"]').element as HTMLTextAreaElement).value).toBe('想再试一次')
    expect(wrapper.get('[data-testid="retry-message"]').element.tagName).toBe('BUTTON')
    const firstId = apiMock.sendMessage.mock.calls.at(-1)![1].clientMessageId
    await wrapper.get('[data-testid="retry-message"]').trigger('click')
    await flushPromises()
    expect(apiMock.sendMessage.mock.calls.at(-1)![1].clientMessageId).toBe(firstId)
    expect(wrapper.find('[data-testid="retry-message"]').exists()).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { apiMock } from '../setup'
import type { ChatMessage } from '@/domain/models'

describe('chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds one user message and one deterministic reply', async () => {
    const store = useChatStore()
    const sending = store.send('今天有点累')

    expect(store.messages.at(-1)?.sender).toBe('user')
    expect(store.isReplying).toBe(true)

    await sending

    expect(store.messages.map((message) => message.sender)).toEqual(['user', 'companion'])
    expect(store.messages[0].status).toBe('sent')
    expect(store.messages.at(-1)?.content).toContain('撑了很久')
    expect(store.isReplying).toBe(false)
  })

  it('ignores blank messages', async () => {
    const store = useChatStore()
    await store.send('   ')
    expect(store.messages).toHaveLength(0)
  })

  it('clears the previous companion history while loading the next chat', async () => {
    const store = useChatStore()
    await store.send('Mika 的对话')
    const loading = store.load('luna')
    expect(store.messages).toHaveLength(0)
    expect(store.loaded).toBe(false)
    await loading
    expect(store.companionId).toBe('luna')
    expect(store.loaded).toBe(true)
  })

  it('ignores history arriving after another companion has been loaded', async () => {
    const store = useChatStore()
    const oldThread = await apiMock.getChat('mika')
    let finishLoading!: (value: typeof oldThread) => void
    apiMock.getChat.mockImplementationOnce(() => new Promise(resolve => { finishLoading = resolve }))
    const oldLoad = store.load('mika')
    await store.load('aiden')
    await store.send('Aiden 的对话')

    finishLoading(oldThread)
    await oldLoad
    expect(store.companionId).toBe('aiden')
    expect(store.messages[0].content).toBe('Aiden 的对话')
  })

  it('keeps a late reply from the previous companion out of the current chat', async () => {
    const store = useChatStore()
    const oldReply = await apiMock.sendMessage('mika', { text: '旧对话', clientMessageId: 'old' })
    let finishReply!: (value: typeof oldReply) => void
    apiMock.sendMessage.mockImplementationOnce(() => new Promise(resolve => { finishReply = resolve }))
    const oldSend = store.send('旧对话')
    await store.load('luna')
    finishReply(oldReply)
    await oldSend
    expect(store.companionId).toBe('luna')
    expect(store.messages).toHaveLength(0)
    expect(store.isReplying).toBe(false)
  })

  it('marks a rejected message as failed so it can be retried', async () => {
    apiMock.sendMessage.mockRejectedValueOnce(new Error('请求失败'))
    const store = useChatStore()

    await expect(store.send('今天有点累')).rejects.toThrow('请求失败')

    expect(store.messages[0].status).toBe('failed')
    expect(store.isReplying).toBe(false)
  })

  it('retries a failed message with the original client id in place', async () => {
    const store = useChatStore()
    const failed = { id: 'user-fixed', sender: 'user', content: '重试我', createdAt: new Date().toISOString(), status: 'failed' } as ChatMessage
    store.messages = [failed]

    await store.retry(failed)

    expect(apiMock.sendMessage).toHaveBeenCalledWith('mika', expect.objectContaining({ clientMessageId: 'user-fixed' }))
    expect(store.messages.filter((message) => message.id === 'user-fixed')).toHaveLength(1)
    expect(store.messages[0].status).toBe('sent')
  })
})

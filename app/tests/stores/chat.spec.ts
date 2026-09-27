import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { apiMock } from '../setup'

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

  it('marks a rejected message as failed so it can be retried', async () => {
    apiMock.sendMessage.mockRejectedValueOnce(new Error('请求失败'))
    const store = useChatStore()

    await expect(store.send('今天有点累')).rejects.toThrow('请求失败')

    expect(store.messages[0].status).toBe('failed')
    expect(store.isReplying).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '@/stores/chat'

describe('chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('adds one user message and one deterministic reply', async () => {
    const store = useChatStore()
    const sending = store.send('今天有点累')

    expect(store.messages.at(-1)?.sender).toBe('user')
    expect(store.isReplying).toBe(true)

    await vi.runAllTimersAsync()
    await sending

    expect(store.messages.map((message) => message.sender)).toEqual(['user', 'companion'])
    expect(store.messages.at(-1)?.content).toContain('撑了很久')
    expect(store.isReplying).toBe(false)
  })

  it('ignores blank messages', async () => {
    const store = useChatStore()
    await store.send('   ')
    expect(store.messages).toHaveLength(0)
  })
})

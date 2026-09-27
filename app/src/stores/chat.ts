import { defineStore } from 'pinia'
import type { ChatMessage, CompanionId, MoodId } from '@/domain/models'
import { api } from '@/services/api'

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    companionId: 'mika' as CompanionId,
    moodId: 'tired' as MoodId,
    messages: [] as ChatMessage[],
    isReplying: false,
    loaded: false,
    error: '',
  }),
  actions: {
    async load(companionId: CompanionId) {
      this.companionId = companionId
      this.loaded = false
      const thread = await api.getChat(companionId)
      this.messages = thread.messages
      this.loaded = true
    },
    async send(text: string) {
      const content = text.trim()
      if (!content || this.isReplying) return

      const id = messageId('user')
      const optimistic: ChatMessage = {
        id,
        sender: 'user',
        content,
        createdAt: new Date().toISOString(),
        status: 'sending',
      }
      this.messages.push(optimistic)
      this.isReplying = true
      this.error = ''
      try {
        const result = await api.sendMessage(this.companionId, { text: content, moodId: this.moodId, clientMessageId: id })
        Object.assign(optimistic, result.userMessage)
        this.messages.push(result.companionMessage)
      } catch (error) {
        optimistic.status = 'failed'
        this.error = error instanceof Error ? error.message : '发送失败'
        throw error
      } finally {
        this.isReplying = false
      }
    },
    async retry(message: ChatMessage) {
      if (message.sender !== 'user' || message.status !== 'failed') return
      this.messages = this.messages.filter((item) => item.id !== message.id)
      await this.send(message.content)
    },
    async saveLatestMemory() {
      const message = [...this.messages].reverse().find((item) => item.sender === 'user' && item.status === 'sent')
      if (!message) return
      await api.saveMemory(this.companionId, message.id)
    },
  },
})

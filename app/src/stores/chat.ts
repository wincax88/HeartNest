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
    errorCode: '',
    favoriteByMessage: {} as Record<string, string>,
  }),
  actions: {
    async load(companionId: CompanionId) {
      this.companionId = companionId
      this.loaded = false
      const thread = await api.getChat(companionId)
      this.messages = thread.messages
      this.loaded = true
    },
    async send(text: string, existingId?: string) {
      const content = text.trim()
      if (!content || this.isReplying) return

      const id = existingId || messageId('user')
      const existingIndex = this.messages.findIndex((message) => message.id === id)
      if (existingIndex === -1) {
        this.messages.push({ id, sender: 'user', content, createdAt: new Date().toISOString(), status: 'sending' })
      } else {
        this.messages[existingIndex] = { ...this.messages[existingIndex], content, status: 'sending' }
      }
      this.isReplying = true
      this.error = ''
      this.errorCode = ''
      try {
        const result = await api.sendMessage(this.companionId, { text: content, moodId: this.moodId, clientMessageId: id })
        const pendingIndex = this.messages.findIndex((message) => message.id === id)
        if (pendingIndex !== -1) this.messages[pendingIndex] = result.userMessage
        if (!this.messages.some((message) => message.id === result.companionMessage.id)) this.messages.push(result.companionMessage)
      } catch (error) {
        const pendingIndex = this.messages.findIndex((message) => message.id === id)
        if (pendingIndex !== -1) this.messages[pendingIndex] = { ...this.messages[pendingIndex], status: 'failed' }
        this.error = error instanceof Error ? error.message : '发送失败'
        this.errorCode = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'SEND_FAILED'
        throw error
      } finally {
        this.isReplying = false
      }
    },
    async retry(message: ChatMessage) {
      if (message.sender !== 'user' || message.status !== 'failed') return
      await this.send(message.content, message.id)
    },
    async toggleFavorite(message: ChatMessage) {
      if (message.status !== 'sent') return
      const favoriteId = this.favoriteByMessage[message.id]
      if (favoriteId) {
        await api.deleteFavorite(favoriteId)
        delete this.favoriteByMessage[message.id]
        return
      }
      const favorite = await api.favoriteMessage(message.id)
      this.favoriteByMessage[message.id] = favorite.id
    },
    async saveLatestMemory() {
      const message = [...this.messages].reverse().find((item) => item.sender === 'user' && item.status === 'sent')
      if (!message) return
      await api.saveMemory(this.companionId, message.id)
    },
  },
})

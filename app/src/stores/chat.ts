import { defineStore } from 'pinia'
import type { ChatMessage, CompanionId, MoodId } from '@/domain/models'
import { chooseReply } from '@/domain/reply-policy'

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    companionId: 'mika' as CompanionId,
    moodId: 'tired' as MoodId,
    messages: [] as ChatMessage[],
    isReplying: false,
  }),
  actions: {
    async send(text: string) {
      const content = text.trim()
      if (!content || this.isReplying) return

      this.messages.push({
        id: messageId('user'),
        sender: 'user',
        content,
        createdAt: new Date().toISOString(),
        status: 'sent',
      })
      this.isReplying = true

      await new Promise<void>((resolve) => setTimeout(resolve, 650))

      this.messages.push({
        id: messageId('companion'),
        sender: 'companion',
        content: chooseReply({ companionId: this.companionId, moodId: this.moodId, text: content }),
        createdAt: new Date().toISOString(),
        status: 'sent',
      })
      this.isReplying = false
    },
  },
})

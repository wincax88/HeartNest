import { defineStore } from 'pinia'
import type { MemoryItem, ReviewDay } from '@/domain/models'
import { api } from '@/services/api'

export const useReviewStore = defineStore('review', {
  state: () => ({
    reviewDays: [] as ReviewDay[],
    memories: [] as MemoryItem[],
  }),
  actions: {
    hydrate(reviewDays: ReviewDay[], memories: MemoryItem[]) {
      this.reviewDays = reviewDays
      this.memories = memories
    },
    async removeMemory(id: string) {
      await api.deleteMemory(id)
      this.memories = this.memories.filter((item) => item.id !== id)
    },
  },
})

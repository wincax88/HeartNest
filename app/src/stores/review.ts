import { defineStore } from 'pinia'
import type { MoodId, MoodRecord } from '@/domain/models'
import { initialMemories, reviewDays } from '@/mocks/reviews'

export const useReviewStore = defineStore('review', {
  state: () => ({
    reviewDays: [...reviewDays],
    memories: [...initialMemories],
    localRecords: [] as MoodRecord[],
  }),
  actions: {
    addMoodRecord(moodId: MoodId, summary: string) {
      this.localRecords.push({
        id: `mood-${Date.now()}`,
        date: new Date().toISOString(),
        moodId,
        summary,
      })
    },
  },
})

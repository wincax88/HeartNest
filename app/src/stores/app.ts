import { defineStore } from 'pinia'
import type { CompanionId, MoodId } from '@/domain/models'

export const useAppStore = defineStore('app', {
  state: () => ({
    selectedMoodId: 'calm' as MoodId,
    selectedCompanionId: 'mika' as CompanionId,
    onboardingCompleted: false,
  }),
  actions: {
    selectMood(moodId: MoodId) {
      this.selectedMoodId = moodId
    },
    selectCompanion(companionId: CompanionId) {
      this.selectedCompanionId = companionId
    },
    completeOnboarding() {
      this.onboardingCompleted = true
    },
  },
})

import { defineStore } from 'pinia'
import type { CompanionId, MoodId } from '@/domain/models'
import { api } from '@/services/api'

export const useAppStore = defineStore('app', {
  state: () => ({
    selectedMoodId: 'calm' as MoodId,
    selectedCompanionId: 'mika' as CompanionId,
    onboardingCompleted: false,
  }),
  actions: {
    hydrate(state: { selectedMoodId: MoodId; selectedCompanionId: CompanionId; onboardingCompleted: boolean }) {
      Object.assign(this, state)
    },
    async selectMood(moodId: MoodId) {
      const previous = this.selectedMoodId
      this.selectedMoodId = moodId
      try {
        await api.updateState({ selectedMoodId: moodId })
      } catch (error) {
        this.selectedMoodId = previous
        throw error
      }
    },
    async selectCompanion(companionId: CompanionId) {
      const previous = this.selectedCompanionId
      this.selectedCompanionId = companionId
      try {
        await api.updateState({ selectedCompanionId: companionId })
      } catch (error) {
        this.selectedCompanionId = previous
        throw error
      }
    },
    async completeOnboarding() {
      this.onboardingCompleted = true
      await api.updateState({ onboardingCompleted: true })
    },
  },
})

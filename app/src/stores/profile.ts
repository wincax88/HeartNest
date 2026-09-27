import { defineStore } from 'pinia'
import type { AppPreferences, BootstrapData, Membership, UserProfile, UserStats } from '@/domain/models'
import { api } from '@/services/api'

const defaultProfile: UserProfile = { displayName: '新朋友', streakDays: 0, preferredCompanionId: 'mika' }
const freeMembership: Membership = { tier: 'free', title: '心栖体验', benefits: [] }
const defaultPreferences: AppPreferences = { notificationsEnabled: true, replyStyle: 'gentle', memoryPromptsEnabled: true, onboardingCompleted: false }

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: { ...defaultProfile },
    membership: { ...freeMembership },
    preferences: { ...defaultPreferences },
    stats: { conversations: 0, memories: 0, activeDays: 0 } as UserStats,
  }),
  actions: {
    hydrate(data: Pick<BootstrapData, 'profile' | 'membership' | 'preferences' | 'stats'>) {
      this.profile = data.profile
      this.membership = data.membership
      this.preferences = data.preferences
      this.stats = data.stats
    },
    async activateTrial() {
      this.membership = await api.activateTrial()
    },
    async setNotifications(enabled: boolean) {
      this.preferences.notificationsEnabled = enabled
      try { this.preferences = await api.updatePreferences({ notificationsEnabled: enabled }) }
      catch (error) { this.preferences.notificationsEnabled = !enabled; throw error }
    },
    async setMemoryPrompts(enabled: boolean) {
      this.preferences.memoryPromptsEnabled = enabled
      try { this.preferences = await api.updatePreferences({ memoryPromptsEnabled: enabled }) }
      catch (error) { this.preferences.memoryPromptsEnabled = !enabled; throw error }
    },
    async setReplyStyle(style: AppPreferences['replyStyle']) {
      const previous = this.preferences.replyStyle
      this.preferences.replyStyle = style
      try { this.preferences = await api.updatePreferences({ replyStyle: style }) }
      catch (error) { this.preferences.replyStyle = previous; throw error }
    },
  },
})

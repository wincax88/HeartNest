import { defineStore } from 'pinia'
import type { AppPreferences } from '@/domain/models'
import { defaultPreferences, defaultProfile, memberships } from '@/mocks/profile'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: { ...defaultProfile },
    membership: memberships.free,
    preferences: { ...defaultPreferences },
  }),
  actions: {
    upgradeLocally() {
      this.membership = memberships.pro
    },
    setNotifications(enabled: boolean) {
      this.preferences.notificationsEnabled = enabled
    },
    setMemoryPrompts(enabled: boolean) {
      this.preferences.memoryPromptsEnabled = enabled
    },
    setReplyStyle(style: AppPreferences['replyStyle']) {
      this.preferences.replyStyle = style
    },
  },
})

import { defineStore } from 'pinia'
import type { BootstrapData, Companion, CompanionId, MoodOption } from '@/domain/models'
import { api } from '@/services/api'
import { useAppStore } from './app'
import { useProfileStore } from './profile'
import { useReviewStore } from './review'

const emptyCompanionStats = {
  mika: { conversations: 0 }, luna: { conversations: 0 }, aiden: { conversations: 0 },
} satisfies BootstrapData['companionStats']

export const useBootstrapStore = defineStore('bootstrap', {
  state: () => ({
    companions: [] as Companion[],
    moods: [] as MoodOption[],
    companionStats: { ...emptyCompanionStats },
    loaded: false,
    loading: false,
    error: '',
  }),
  getters: {
    companionById: (state) => Object.fromEntries(state.companions.map((item) => [item.id, item])) as Partial<Record<CompanionId, Companion>>,
  },
  actions: {
    hydrate(data: BootstrapData) {
      this.companions = data.companions
      this.moods = data.moods
      this.companionStats = data.companionStats
      useAppStore().hydrate(data.state)
      useProfileStore().hydrate(data)
      useReviewStore().hydrate(data.reviewDays, data.memories)
      this.loaded = true
      this.error = ''
    },
    async initialize(force = false) {
      if ((this.loaded && !force) || this.loading) return
      this.loading = true
      this.error = ''
      try {
        this.hydrate(await api.bootstrap())
      } catch (error) {
        this.error = error instanceof Error ? error.message : '数据加载失败'
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})

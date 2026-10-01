import { defineStore } from 'pinia'
import type { NotificationConfiguration, ReminderInput, ReminderSchedule } from '@/domain/models'
import { api } from '@/services/api'
import { notificationChannel } from '@/services/notification-platform'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({ schedules: [] as ReminderSchedule[], channel: null as ReminderSchedule['channel'] | null, configuration: null as NotificationConfiguration | null, supported: false, loading: false, loaded: false }),
  actions: {
    detectSupport() {
      this.channel = notificationChannel()
      this.supported = this.channel !== null
    },
    async load() {
      this.detectSupport()
      if (!this.supported || this.loading) return
      this.loading = true
      try {
        const [configuration, schedules] = await Promise.all([api.getNotificationConfiguration(), api.getReminders()])
        this.configuration = configuration
        this.schedules = schedules
        this.loaded = true
      } finally { this.loading = false }
    },
    async save(input: ReminderInput) {
      const existing = this.schedules.find(item => item.channel === input.channel)
      const saved = existing ? await api.updateReminder(existing.id, input) : await api.createReminder(input)
      this.schedules = [...this.schedules.filter(item => item.id !== saved.id), saved]
      return saved
    },
    async remove(id: string) { await api.deleteReminder(id); this.schedules = this.schedules.filter((item) => item.id !== id) },
  },
})

import { defineStore } from 'pinia'
import type { ReminderSchedule } from '@/domain/models'
import { api } from '@/services/api'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({ schedules: [] as ReminderSchedule[], supported: true, loading: false }),
  actions: {
    detectSupport() {
      // #ifdef H5
      this.supported = false
      // #endif
    },
    async load() { this.detectSupport(); if (!this.supported) return; this.schedules = await api.getReminders() },
    async create(input: Omit<ReminderSchedule, 'id' | 'nextDeliveryAt'> & { target: Record<string, string>; payload: Record<string, unknown> }) {
      const created = await api.createReminder(input)
      this.schedules.push(created)
    },
    async remove(id: string) { await api.deleteReminder(id); this.schedules = this.schedules.filter((item) => item.id !== id) },
  },
})

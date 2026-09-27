import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useProfileStore } from '@/stores/profile'
import { useReviewStore } from '@/stores/review'

describe('experience stores', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('records the selected mood and onboarding completion through the API', async () => {
    const store = useAppStore()
    await store.selectMood('anxious')
    await store.completeOnboarding()
    expect(store.selectedMoodId).toBe('anxious')
    expect(store.onboardingCompleted).toBe(true)
  })

  it('activates a persisted trial and keeps preferences editable', async () => {
    const store = useProfileStore()
    await store.activateTrial()
    await store.setNotifications(false)
    expect(store.membership.tier).toBe('pro')
    expect(store.preferences.notificationsEnabled).toBe(false)
  })

  it('hydrates the review timeline from server data', () => {
    const store = useReviewStore()
    store.hydrate([{ date: '09/27', weekday: '周日', score: 4, moodId: 'calm', label: '平静', summary: '今晚终于放松了一点', keywords: [], recorded: true }], [])
    expect(store.reviewDays.at(-1)?.summary).toBe('今晚终于放松了一点')
  })
})

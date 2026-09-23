import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useProfileStore } from '@/stores/profile'
import { useReviewStore } from '@/stores/review'

describe('experience stores', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('records the selected mood and onboarding completion', () => {
    const store = useAppStore()
    store.selectMood('anxious')
    store.completeOnboarding()
    expect(store.selectedMoodId).toBe('anxious')
    expect(store.onboardingCompleted).toBe(true)
  })

  it('upgrades membership locally and keeps preferences editable', () => {
    const store = useProfileStore()
    store.upgradeLocally()
    store.setNotifications(false)
    expect(store.membership.tier).toBe('pro')
    expect(store.preferences.notificationsEnabled).toBe(false)
  })

  it('adds a local mood record to the review timeline', () => {
    const store = useReviewStore()
    store.addMoodRecord('calm', '今晚终于放松了一点')
    expect(store.localRecords.at(-1)?.summary).toBe('今晚终于放松了一点')
  })
})

import { describe, expect, it } from 'vitest'
import { defaultPersistedState, readPersistedState } from '@/stores/persistence'

describe('persisted state', () => {
  it('falls back when the persisted version is unsupported', () => {
    expect(readPersistedState({ version: 0, data: {} })).toEqual(defaultPersistedState())
  })

  it('preserves supported data', () => {
    const stored = defaultPersistedState()
    stored.data.onboardingCompleted = true
    expect(readPersistedState(stored).data.onboardingCompleted).toBe(true)
  })
})

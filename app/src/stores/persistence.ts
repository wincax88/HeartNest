export interface PersistedData {
  onboardingCompleted: boolean
}

export interface PersistedState {
  version: 1
  data: PersistedData
}

export function defaultPersistedState(): PersistedState {
  return { version: 1, data: { onboardingCompleted: false } }
}

export function readPersistedState(_raw: unknown): PersistedState {
  if (!_raw || typeof _raw !== 'object') return defaultPersistedState()
  const candidate = _raw as Partial<PersistedState>
  if (candidate.version !== 1 || !candidate.data || typeof candidate.data.onboardingCompleted !== 'boolean') {
    return defaultPersistedState()
  }
  return {
    version: 1,
    data: { onboardingCompleted: candidate.data.onboardingCompleted },
  }
}

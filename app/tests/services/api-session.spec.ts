import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/services/api')

describe('API session storage', () => {
  const getStorageSync = vi.fn()

  beforeEach(() => {
    getStorageSync.mockReset()
    vi.stubGlobal('uni', {
      getStorageSync,
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
      request: vi.fn(),
    })
  })

  it('reports a stored session only when a refresh token exists', async () => {
    const { hasStoredSession } = await import('@/services/api')

    getStorageSync.mockReturnValueOnce('')
    expect(hasStoredSession()).toBe(false)

    getStorageSync.mockReturnValueOnce('refresh-token')
    expect(hasStoredSession()).toBe(true)
  })
})

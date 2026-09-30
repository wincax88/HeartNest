import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ConsentPage from '@/pages/consent/index.vue'
import { ApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { apiMock } from '../setup'

describe('auth and privacy flows', () => {
  const navigateTo = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    navigateTo.mockReset()
    vi.stubGlobal('uni', {
      navigateTo,
      reLaunch: vi.fn(),
      showToast: vi.fn(),
      getStorageSync: vi.fn(),
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
    })
  })

  it('blocks continue until privacy, terms and AI consent are accepted', async () => {
    const wrapper = mount(ConsentPage, { global: { plugins: [createPinia()] } })
    const button = wrapper.get('[data-testid="consent-continue"]')
    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="consent-all"]').trigger('click')
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/login/index' })
  })

  it('refreshes once after an expired access token', async () => {
    const store = useAuthStore()
    apiMock.bootstrap.mockRejectedValueOnce(new ApiError(401, 'TOKEN_EXPIRED', 'expired'))

    await store.authorizedBootstrap()
    await flushPromises()

    expect(apiMock.refreshSession).toHaveBeenCalledTimes(1)
    expect(apiMock.bootstrap).toHaveBeenCalledTimes(2)
  })
})

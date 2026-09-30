import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from '@/pages/profile/index.vue'
import { useMembershipStore } from '@/stores/membership'

describe('completed product flows', () => {
  const navigateTo = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    navigateTo.mockReset()
    vi.stubGlobal('uni', { navigateTo, reLaunch: vi.fn(), showToast: vi.fn() })
  })

  it('opens the real favorites page from profile', async () => {
    const wrapper = mount(ProfilePage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    await wrapper.get('[data-testid="menu-favorites"]').trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/favorites/index' })
  })

  it('keeps membership free while a payment order is confirming', async () => {
    const store = useMembershipStore()
    store.membership = { tier: 'free', title: '心栖体验', benefits: [] }

    await store.purchase('heartnest-pro-monthly')

    expect(store.order?.status).toBe('confirming')
    expect(store.membership.tier).toBe('free')
  })
})

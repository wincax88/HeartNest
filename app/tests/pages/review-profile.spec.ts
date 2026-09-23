import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReviewPage from '@/pages/review/index.vue'
import ProfilePage from '@/pages/profile/index.vue'
import SettingsPage from '@/pages/settings/index.vue'
import MembershipPage from '@/pages/membership/index.vue'
import { useProfileStore } from '@/stores/profile'

describe('review and profile flows', () => {
  const navigateTo = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    navigateTo.mockReset()
    vi.stubGlobal('uni', { navigateTo, navigateBack: vi.fn(), reLaunch: vi.fn() })
  })

  it('renders the seven-day review and memories', () => {
    const wrapper = mount(ReviewPage, { global: { plugins: [createPinia()] } })
    expect(wrapper.findAll('[data-testid="review-day"]')).toHaveLength(7)
    expect(wrapper.findAll('[data-testid="memory-item"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('这一周，你在慢慢恢复')
  })

  it('opens settings and membership from profile', async () => {
    const wrapper = mount(ProfilePage, { global: { plugins: [createPinia()] } })
    await wrapper.get('[data-testid="open-settings"]').trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/settings/index' })
    await wrapper.get('[data-testid="open-membership"]').trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/membership/index' })
  })

  it('updates local notification preferences', async () => {
    const pinia = createPinia()
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    const profileStore = useProfileStore(pinia)
    expect(profileStore.preferences.notificationsEnabled).toBe(true)
    await wrapper.get('[data-testid="notification-toggle"]').trigger('click')
    expect(profileStore.preferences.notificationsEnabled).toBe(false)
  })

  it('upgrades the local membership demo', async () => {
    const pinia = createPinia()
    const wrapper = mount(MembershipPage, { global: { plugins: [pinia] } })
    const profileStore = useProfileStore(pinia)
    await wrapper.get('[data-testid="upgrade-membership"]').trigger('click')
    expect(profileStore.membership.tier).toBe('pro')
    expect(wrapper.text()).toContain('已解锁心栖会员')
  })
})

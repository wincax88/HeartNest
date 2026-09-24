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

  const showActionSheet = vi.fn()
  const showModal = vi.fn()

  beforeEach(() => {
    setActivePinia(createPinia())
    navigateTo.mockReset()
    showActionSheet.mockReset()
    showModal.mockReset()
    vi.stubGlobal('uni', {
      navigateTo,
      navigateBack: vi.fn(),
      reLaunch: vi.fn(),
      showActionSheet,
      showModal,
    })
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

  it('opens profile menu destinations', async () => {
    const reLaunch = vi.fn()
    vi.stubGlobal('uni', {
      navigateTo,
      navigateBack: vi.fn(),
      reLaunch,
      showActionSheet: vi.fn(),
      showModal: vi.fn(),
    })
    const wrapper = mount(ProfilePage, { global: { plugins: [createPinia()] } })

    await wrapper.get('[data-testid="menu-companions"]').trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/companion/index?id=mika' })

    await wrapper.get('[data-testid="menu-calendar"]').trigger('click')
    expect(reLaunch).toHaveBeenCalledWith({ url: '/pages/review/index' })

    await wrapper.get('[data-testid="menu-favorites"]').trigger('click')
    expect(reLaunch).toHaveBeenCalledWith({ url: '/pages/review/index' })
  })

  it('updates local notification preferences', async () => {
    const pinia = createPinia()
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    const profileStore = useProfileStore(pinia)
    expect(profileStore.preferences.notificationsEnabled).toBe(true)
    await wrapper.get('[data-testid="notification-toggle"]').trigger('click')
    expect(profileStore.preferences.notificationsEnabled).toBe(false)
  })

  it('toggles memory prompts and opens settings actions', async () => {
    const pinia = createPinia()
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } })
    const profileStore = useProfileStore(pinia)

    await wrapper.get('[data-testid="memory-prompt-toggle"]').trigger('click')
    expect(profileStore.preferences.memoryPromptsEnabled).toBe(false)

    await wrapper.get('[data-testid="reply-style-row"]').trigger('click')
    expect(showActionSheet).toHaveBeenCalled()

    await wrapper.get('[data-testid="local-data-row"]').trigger('click')
    expect(showModal).toHaveBeenCalledWith(expect.objectContaining({ title: '本地数据说明' }))

    await wrapper.get('[data-testid="help-feedback-row"]').trigger('click')
    expect(showModal).toHaveBeenCalledWith(expect.objectContaining({ title: '帮助与反馈' }))
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

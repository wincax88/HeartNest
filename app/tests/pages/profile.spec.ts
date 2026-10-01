import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from '@/pages/profile/index.vue'
import { api } from '@/services/api'
import { useProfileStore } from '@/stores/profile'
import { useBootstrapStore } from '@/stores/bootstrap'
import { useAppStore } from '@/stores/app'

describe('profile interactions and states', () => {
  beforeEach(() => {
    vi.stubGlobal('uni', { navigateTo: vi.fn(), reLaunch: vi.fn(), showToast: vi.fn() })
  })
  afterEach(() => { vi.restoreAllMocks() })

  async function render(pinia = createPinia()) {
    const wrapper = mount(ProfilePage, { global: { plugins: [pinia] } })
    await flushPromises()
    return { wrapper, store: useProfileStore(pinia), pinia }
  }

  it('keeps unloaded default statistics and profile actions out of the loading state', async () => {
    vi.spyOn(api, 'bootstrap').mockReturnValueOnce(new Promise(() => {}))
    const { wrapper } = await render()
    expect(wrapper.text()).toContain('正在载入个人资料')
    expect(wrapper.find('[data-testid="edit-profile"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="profile-stat-conversations"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('offers retry after a load failure without showing default user data', async () => {
    vi.spyOn(api, 'bootstrap').mockRejectedValueOnce(new Error('无法连接服务器'))
    const { wrapper } = await render()
    expect(wrapper.text()).toContain('暂时没能加载个人资料')
    expect(wrapper.find('[data-testid="edit-profile"]').exists()).toBe(false)
    await wrapper.get('.async-state__action').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="edit-profile"]').exists()).toBe(true)
  })

  it('retains loaded profile data when a refresh fails', async () => {
    const pinia = createPinia()
    useBootstrapStore(pinia).hydrate(await api.bootstrap())
    useProfileStore(pinia).profile.displayName = '已保存的昵称'
    vi.spyOn(api, 'bootstrap').mockRejectedValueOnce(new Error('无法连接服务器'))
    const { wrapper } = await render(pinia)
    expect(wrapper.text()).toContain('新数据暂时没能同步')
    expect(wrapper.get('[data-testid="edit-profile"]').text()).toContain('已保存的昵称')
  })

  it('uses a neutral avatar fallback and recovers when a different avatar is saved', async () => {
    const { wrapper, store } = await render()
    expect(wrapper.find('[data-testid="profile-avatar-fallback"]').exists()).toBe(true)
    store.profile.avatar = 'https://cdn.heartnest.test/first-avatar.png'
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-testid="profile-avatar"]').trigger('error')
    expect(wrapper.find('[data-testid="profile-avatar"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="profile-avatar-fallback"]').exists()).toBe(true)
    store.profile.avatar = 'https://cdn.heartnest.test/new-avatar.png'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="profile-avatar"]').attributes('src')).toContain('new-avatar.png')
  })

  it('opens profile editing and membership with the keyboard', async () => {
    const { wrapper } = await render()
    await wrapper.get('[data-testid="edit-profile"]').trigger('keydown', { key: 'Enter' })
    expect(uni.navigateTo).toHaveBeenLastCalledWith({ url: '/pages/profile-edit/index' })
    await wrapper.get('[data-testid="open-membership"]').trigger('keydown', { key: ' ' })
    expect(uni.navigateTo).toHaveBeenLastCalledWith({ url: '/pages/membership/index' })
    expect(uni.navigateTo).toHaveBeenCalledTimes(2)
  })

  it('opens the preferred companion from the menu and selected companion from navigation', async () => {
    const { wrapper, store, pinia } = await render()
    store.profile.preferredCompanionId = 'luna'
    useAppStore(pinia).selectedCompanionId = 'aiden'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="menu-companions"]').text()).toContain('偏好陪伴 · Luna')
    await wrapper.get('[data-testid="menu-companions"]').trigger('click')
    expect(uni.navigateTo).toHaveBeenLastCalledWith({ url: '/pages/companion/index?id=luna' })
    await wrapper.get('[data-testid="nav-companions"]').trigger('click')
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/companion/index?id=aiden' })
  })

  it('places profile content below the WeChat capsule when its bounds are available', async () => {
    vi.stubGlobal('uni', { navigateTo: vi.fn(), reLaunch: vi.fn(), getMenuButtonBoundingClientRect: () => ({ bottom: 92 }) })
    const { wrapper } = await render()
    const padding = Number.parseFloat((wrapper.get('.user-page').element as HTMLElement).style.paddingTop)
    expect(padding).toBeGreaterThan(92)
  })
})

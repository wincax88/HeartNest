import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from '@/pages/home/index.vue'
import { useAppStore } from '@/stores/app'

describe('home page', () => {
  const navigateTo = vi.fn()

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    navigateTo.mockReset()
    vi.stubGlobal('uni', { navigateTo, redirectTo: vi.fn(), switchTab: vi.fn() })
  })

  it('stores the selected mood', async () => {
    const wrapper = mount(HomePage, { global: { plugins: [createPinia()] } })
    await wrapper.get('[data-testid="mood-tired"]').trigger('click')
    expect(useAppStore().selectedMoodId).toBe('tired')
  })

  it('opens Mika profile from the companion card', async () => {
    const wrapper = mount(HomePage, { global: { plugins: [createPinia()] } })
    await wrapper.get('[data-testid="companion-mika"]').trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/companion/index?id=mika' })
  })

  it('starts chat with the current companion', async () => {
    const wrapper = mount(HomePage, { global: { plugins: [createPinia()] } })
    await wrapper.get('[data-testid="start-chat"]').trigger('click')
    expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/chat/index?id=mika' })
  })
})

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileEditPage from '@/pages/profile-edit/index.vue'
import { api } from '@/services/api'
import { useProfileStore } from '@/stores/profile'
import { useBootstrapStore } from '@/stores/bootstrap'

const managedAvatar = '/api/avatars/12345678-1234-1234-1234-123456789abc'

describe('editing profile', () => {
  beforeEach(() => {
    vi.stubGlobal('uni', { navigateBack: vi.fn(), reLaunch: vi.fn(), showToast: vi.fn(), chooseImage: vi.fn(), canIUse: vi.fn(() => true) })
  })
  afterEach(() => vi.restoreAllMocks())

  async function render() {
    const pinia = createPinia()
    const wrapper = mount(ProfileEditPage, { global: { plugins: [pinia] } })
    await flushPromises()
    return { wrapper, pinia, store: useProfileStore(pinia) }
  }

  it('uses native WeChat nickname and avatar controls', async () => {
    const { wrapper } = await render()
    expect(wrapper.get('input[type="nickname"]').attributes('name')).toBe('displayName')
    expect(wrapper.get('[data-testid="choose-avatar"]').attributes('open-type')).toBe('chooseAvatar')
    expect(wrapper.text()).not.toContain('HTTPS 地址')
  })

  it('waits for bootstrap and offers a retry after failure', async () => {
    vi.spyOn(api, 'bootstrap').mockRejectedValueOnce(new Error('网络未连接'))
    const { wrapper, pinia } = await render()
    expect(wrapper.find('form').exists()).toBe(false)
    await wrapper.get('.async-state__action').trigger('click')
    await flushPromises()
    expect(useBootstrapStore(pinia).loaded).toBe(true)
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('uploads a temporary WeChat avatar before persisting its durable address', async () => {
    const { wrapper } = await render()
    let finish!: (value: { avatarUrl: string }) => void
    vi.spyOn(api, 'uploadAvatar').mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    await wrapper.get('[data-testid="choose-avatar"]').trigger('chooseavatar', { detail: { avatarUrl: 'wxfile://temporary-avatar' } })
    expect(api.uploadAvatar).toHaveBeenCalledWith('wxfile://temporary-avatar')
    expect(wrapper.get('[data-testid="save-profile"]').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit', { detail: { value: { displayName: '微信朋友' } } })
    expect(api.updateProfile).not.toHaveBeenCalled()
    finish({ avatarUrl: managedAvatar })
    await flushPromises()
    await wrapper.get('form').trigger('submit', { detail: { value: { displayName: ' 微信朋友 ' } } })
    await flushPromises()
    expect(api.updateProfile).toHaveBeenCalledWith({ displayName: '微信朋友', avatarUrl: managedAvatar })
    expect(uni.navigateBack).toHaveBeenCalledOnce()
  })

  it('restores the prior preview on upload failure and supports retry', async () => {
    const { wrapper } = await render()
    vi.spyOn(api, 'uploadAvatar').mockRejectedValueOnce(new Error('上传未成功'))
    await wrapper.get('[data-testid="choose-avatar"]').trigger('chooseavatar', { detail: { avatarUrl: 'wxfile://broken' } })
    await flushPromises()
    expect(wrapper.find('[data-testid="avatar-preview"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="profile-error"]').text()).toBe('上传未成功')
    await wrapper.get('[data-testid="choose-avatar"]').trigger('chooseavatar', { detail: { avatarUrl: 'wxfile://retry' } })
    await flushPromises()
    expect(wrapper.get('[data-testid="avatar-preview"]').attributes('src')).toBe('wxfile://retry')
    expect(wrapper.find('[data-testid="profile-error"]').exists()).toBe(false)
  })

  it('reads the nickname from form submission and preserves companion metadata', async () => {
    const { wrapper, store } = await render()
    store.profile.streakDays = 12
    store.profile.preferredCompanionId = 'luna'
    vi.spyOn(api, 'updateProfile').mockResolvedValueOnce({ displayName: '微信昵称', avatar: 'https://cdn.heartnest.test/saved.png' })
    await wrapper.get('form').trigger('submit', { detail: { value: { displayName: '微信昵称' } } })
    await flushPromises()
    expect(api.updateProfile).toHaveBeenCalledWith({ displayName: '微信昵称' })
    expect(store.profile).toMatchObject({ displayName: '微信昵称', avatar: 'https://cdn.heartnest.test/saved.png', streakDays: 12, preferredCompanionId: 'luna' })
  })

  it('blocks an empty or rejected nickname until the user changes it', async () => {
    const { wrapper } = await render()
    await wrapper.get('form').trigger('submit', { detail: { value: { displayName: '  ' } } })
    expect(wrapper.text()).toContain('请输入 1–30 个字符的昵称')
    const input = wrapper.get('input[type="nickname"]')
    await input.trigger('input', { detail: { value: '待审核昵称' } })
    await input.trigger('nicknamereview', { detail: { pass: false } })
    await input.trigger('blur', { detail: { value: '待审核昵称' } })
    await wrapper.get('form').trigger('submit')
    expect(api.updateProfile).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="save-profile"]').attributes('disabled')).toBeDefined()
    await input.trigger('input', { detail: { value: '新的昵称' } })
    await input.trigger('nicknamereview', { detail: { pass: true } })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.updateProfile).toHaveBeenCalledWith({ displayName: '新的昵称' })
  })

  it('prevents duplicate saves and stays on the form after a failed save', async () => {
    const { wrapper } = await render()
    let fail!: (error: Error) => void
    vi.spyOn(api, 'updateProfile').mockReturnValueOnce(new Promise((_, reject) => { fail = reject }))
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(api.updateProfile).toHaveBeenCalledOnce()
    fail(new Error('保存失败，请重试'))
    await flushPromises()
    expect(uni.navigateBack).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('保存失败，请重试')
    expect(wrapper.get('[data-testid="save-profile"]').attributes('disabled')).toBeUndefined()
  })

  it('returns direct-entry visitors to their profile after saving', async () => {
    vi.stubGlobal('getCurrentPages', () => [{}])
    try {
      const { wrapper } = await render()
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/profile/index' })
      expect(uni.navigateBack).not.toHaveBeenCalled()
    } finally { vi.unstubAllGlobals() }
  })

  it('supports photo selection on other clients and ignores cancellation', async () => {
    vi.mocked(uni.canIUse).mockReturnValue(false)
    const { wrapper } = await render()
    await wrapper.get('[data-testid="choose-avatar"]').trigger('click')
    const picker = vi.mocked(uni.chooseImage).mock.calls[0][0]!
    picker.fail!({ errMsg: 'chooseImage:fail cancel' })
    picker.complete!({ errMsg: 'chooseImage:fail cancel' })
    await flushPromises()
    expect(wrapper.find('[data-testid="profile-error"]').exists()).toBe(false)
    expect(api.uploadAvatar).not.toHaveBeenCalled()
    await wrapper.get('[data-testid="choose-avatar"]').trigger('click')
    const secondPicker = vi.mocked(uni.chooseImage).mock.calls[1][0]!
    secondPicker.success!({ tempFilePaths: ['blob:avatar'], tempFiles: [{ path: 'blob:avatar', size: 200 }] })
    await flushPromises()
    expect(api.uploadAvatar).toHaveBeenCalledWith('blob:avatar')
  })
})

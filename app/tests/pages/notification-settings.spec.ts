import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReminderPage from '@/pages/notification-settings/index.vue'
import { api, ApiError } from '@/services/api'

const schedule = { id: 'saved-reminder', channel: 'wechat' as const, time: '19:00', timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00', enabled: true, nextDeliveryAt: '2026-10-01T11:00:00Z' }
describe('platform reminder authorization', () => {
  beforeEach(() => {
    vi.stubGlobal('uni', {
      getSystemInfoSync: () => ({ uniPlatform: 'mp-weixin' }),
      requestSubscribeMessage: vi.fn(options => options.success({ [options.tmplIds[0]]: 'accept' })),
      login: vi.fn(options => options.success({ code: 'fresh-wechat-code' })),
      navigateBack: vi.fn(), reLaunch: vi.fn(),
      getAppAuthorizeSetting: vi.fn(() => ({ notificationAuthorized: 'authorized' })),
      getPushClientId: vi.fn(options => options.success({ cid: 'real-device-client-id' })),
    })
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  async function render() {
    const wrapper = mount(ReminderPage, { global: { plugins: [createPinia()] } })
    await flushPromises()
    return wrapper
  }
  async function save(wrapper: Awaited<ReturnType<typeof render>>) {
    await wrapper.get('[data-testid="save-reminder"]').trigger('click')
    await flushPromises()
  }
  it('requests subscription before linking the identity and saving on the WeChat channel', async () => {
    const wrapper = await render()
    expect(uni.requestSubscribeMessage).not.toHaveBeenCalled()
    await save(wrapper)
    expect(uni.requestSubscribeMessage).toHaveBeenCalledWith(expect.objectContaining({ tmplIds: ['reminder-template'] }))
    expect(api.authorizeNotification).toHaveBeenCalledWith({ channel: 'wechat', templateId: 'reminder-template', code: 'fresh-wechat-code' })
    expect(api.createReminder).toHaveBeenCalledWith(expect.objectContaining({ channel: 'wechat', target: { templateId: 'reminder-template' }, payload: {} }))
    expect(vi.mocked(api.authorizeNotification).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(api.createReminder).mock.invocationCallOrder[0])
    expect(api.registerNotificationDevice).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('提醒已保存')
  })
  it.each(['reject', 'ban', 'filter'])('does not save when subscription result is %s', async status => {
    vi.mocked(uni.requestSubscribeMessage).mockImplementation(options => options.success?.({ [options.tmplIds![0]!]: status } as never))
    const wrapper = await render()
    await save(wrapper)
    expect(api.authorizeNotification).not.toHaveBeenCalled()
    expect(api.createReminder).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('你还没有允许订阅提醒')
    expect(wrapper.find('[data-testid="reminder-saved"]').exists()).toBe(false)
  })
  it('disables saving when the real template is not configured', async () => {
    vi.spyOn(api, 'getNotificationConfiguration').mockResolvedValueOnce({ wechat: { available: false, templateId: null }, app: { available: false } })
    const wrapper = await render()
    await save(wrapper)
    expect(wrapper.text()).toContain('提醒服务还在准备中')
    expect(wrapper.get('[data-testid="save-reminder"]').attributes('disabled')).toBeDefined()
    expect(uni.requestSubscribeMessage).not.toHaveBeenCalled()
    expect(api.createReminder).not.toHaveBeenCalled()
  })
  it('retains the selected time and shows failed saves without confirming success', async () => {
    vi.spyOn(api, 'createReminder').mockRejectedValueOnce(new ApiError(403, 'NOTIFICATION_AUTH_REQUIRED', '通知授权已失效'))
    const wrapper = await render()
    await wrapper.get('picker').trigger('change', { detail: { value: '21:15' } })
    await save(wrapper)
    expect(wrapper.get('[data-testid="reminder-error"]').text()).toContain('请重新授权后保存')
    expect(wrapper.get('[data-testid="reminder-time"]').text()).toContain('21:15')
    expect(wrapper.find('[data-testid="reminder-saved"]').exists()).toBe(false)
    await save(wrapper)
    expect(wrapper.text()).toContain('提醒已保存')
  })
  it('updates the existing schedule and prevents overlapping saves', async () => {
    vi.spyOn(api, 'getReminders').mockResolvedValueOnce([schedule])
    let finish!: (result: typeof schedule) => void
    vi.spyOn(api, 'updateReminder').mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const wrapper = await render()
    await save(wrapper)
    await save(wrapper)
    expect(api.updateReminder).toHaveBeenCalledOnce()
    expect(api.createReminder).not.toHaveBeenCalled()
    expect(uni.requestSubscribeMessage).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="save-reminder"]').attributes('disabled')).toBeDefined()
    finish(schedule)
    await flushPromises()
    expect(wrapper.get('[data-testid="save-reminder"]').attributes('disabled')).toBeUndefined()
  })
  it('offers retry after load failure and does not save with unloaded data', async () => {
    vi.spyOn(api, 'getReminders').mockRejectedValueOnce(new Error('网络未连接'))
    const wrapper = await render()
    expect(wrapper.find('[data-testid="save-reminder"]').exists()).toBe(false)
    await wrapper.get('.async-state__action').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="save-reminder"]').exists()).toBe(true)
  })
  it('keeps a reminder after cancellation fails and removes it after a successful retry', async () => {
    vi.spyOn(api, 'getReminders').mockResolvedValueOnce([schedule])
    vi.spyOn(api, 'deleteReminder').mockRejectedValueOnce(new Error('取消失败，请重试'))
    const wrapper = await render()
    await wrapper.get('[data-testid="cancel-reminder"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="cancel-reminder"]').exists()).toBe(true)
    await wrapper.get('[data-testid="cancel-reminder"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="cancel-reminder"]').exists()).toBe(false)
  })
  it('does not request push APIs or reminders in H5', async () => {
    vi.stubGlobal('uni', { getSystemInfoSync: () => ({ uniPlatform: 'h5' }) })
    const wrapper = await render()
    expect(wrapper.text()).toContain('网页版暂不支持系统推送')
    expect(api.getReminders).not.toHaveBeenCalled()
  })
  it('registers the actual App client ID before creating its reminder', async () => {
    vi.spyOn(uni, 'getSystemInfoSync').mockReturnValue({ uniPlatform: 'app' } as never)
    const wrapper = await render()
    await save(wrapper)
    expect(api.registerNotificationDevice).toHaveBeenCalledWith({ platform: 'app', token: 'real-device-client-id', status: 'active' })
    expect(api.createReminder).toHaveBeenCalledWith(expect.objectContaining({ channel: 'app', target: { token: 'real-device-client-id' } }))
    expect(uni.requestSubscribeMessage).not.toHaveBeenCalled()
  })
  it('does not register an App device when system notification permission is denied', async () => {
    vi.spyOn(uni, 'getSystemInfoSync').mockReturnValue({ uniPlatform: 'app' } as never)
    vi.mocked(uni.getAppAuthorizeSetting).mockReturnValue({ notificationAuthorized: 'denied' } as never)
    const wrapper = await render()
    await save(wrapper)
    expect(api.registerNotificationDevice).not.toHaveBeenCalled()
    expect(api.createReminder).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请在系统设置中允许心栖发送通知')
  })
})

// @vitest-environment node
import { createServer } from 'node:http'
import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNotificationService } from '../../server/notifications/service.mjs'
import { createAuthService } from '../../server/auth/service.mjs'
import { createApi } from '../../server/app.mjs'

const cleanup = []
afterEach(async () => { await Promise.all(cleanup.splice(0).map(fn => fn())) })
async function start(configured = true) {
  const grants = new Map()
  const schedules = []
  const repositories = {
    upsertNotificationAuthorization: vi.fn(async (user, input) => { grants.set(user, input); return { status: 'authorized' } }),
    getNotificationAuthorization: async user => grants.get(user),
    notificationTargetAuthorized: async (user, channel, target) => channel === 'wechat' && grants.get(user)?.templateId === target.templateId,
    listReminderSchedules: async () => schedules,
    createReminderSchedule: vi.fn(async (user, input) => { const result = { id: 'reminder', ...input }; schedules.push(result); return result }),
  }
  const resolveWechatSubject = vi.fn(async (user, code) => {
    if (code !== 'own-code') throw Object.assign(new Error('身份不一致'), { status: 403, code: 'NOTIFICATION_IDENTITY_MISMATCH' })
    return 'verified-openid'
  })
  const service = createNotificationService({ repositories, clock: () => new Date('2026-10-01T10:00:00Z'),
    wechatReminder: configured ? { templateId: 'real-template', data: { thing1: { value: '留一点时间给自己' }, time2: { value: '{{time}}' } } } : {}, resolveWechatSubject })
  const authService = { authenticate: async token => {
    if (token !== 'session') throw Object.assign(new Error('请先登录'), { status: 401, code: 'AUTH_REQUIRED' })
    return { userId: 'user' }
  } }
  const server = createServer(createApi({ store: {}, responder: async () => '', authService, notificationService: service }))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections() }))
  const request = (path, data, token = 'session') => fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method: data ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined })
  return { request, repositories, resolveWechatSubject }
}
const reminder = { channel: 'wechat', time: '20:30', timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00', enabled: true, target: { templateId: 'real-template', openId: 'forged-openid' }, payload: { thing1: { value: 'forged-content' } } }
describe('reminder HTTP authorization', () => {
  it('reproduces the former placeholder-device 403 and does not save', async () => {
    const { request, repositories } = await start()
    const response = await request('/reminders', { ...reminder, channel: 'app', target: { token: 'registered-device-token' } })
    expect(response.status).toBe(403)
    expect((await response.json()).error.code).toBe('NOTIFICATION_AUTH_REQUIRED')
    expect(repositories.createReminderSchedule).not.toHaveBeenCalled()
  })
  it('requires subscription authorization and derives the receiver and template data on the server', async () => {
    const { request, repositories } = await start()
    expect((await request('/reminders', reminder)).status).toBe(403)
    expect((await request('/notifications/authorizations', { channel: 'wechat', templateId: 'real-template', code: 'own-code', subject: 'forged-openid' })).status).toBe(201)
    const response = await request('/reminders', reminder)
    expect(response.status).toBe(201)
    const result = await response.json()
    expect(result.target).toEqual({ templateId: 'real-template', openId: 'verified-openid', page: 'pages/home/index' })
    expect(result.payload).toEqual({ thing1: { value: '留一点时间给自己' }, time2: { value: '2026-10-01 20:30' } })
    expect(repositories.upsertNotificationAuthorization).toHaveBeenCalledWith('user', expect.objectContaining({ subject: 'verified-openid' }))
  })
  it('rejects mismatched identities and unknown templates without recording consent', async () => {
    const { request, repositories, resolveWechatSubject } = await start()
    expect((await request('/notifications/authorizations', { channel: 'wechat', templateId: 'real-template', code: 'foreign-code' })).status).toBe(403)
    expect((await request('/notifications/authorizations', { channel: 'wechat', templateId: 'foreign-template', code: 'own-code' })).status).toBe(400)
    expect(resolveWechatSubject).toHaveBeenCalledOnce()
    expect(repositories.upsertNotificationAuthorization).not.toHaveBeenCalled()
  })
  it('exposes unavailable capability when the template is missing and still requires a session', async () => {
    const { request } = await start(false)
    expect((await (await request('/notifications/config')).json()).wechat).toEqual({ available: false, templateId: null })
    expect((await request('/notifications/config', undefined, 'invalid')).status).toBe(401)
    expect((await request('/notifications/authorizations', { channel: 'wechat', templateId: 'real-template', code: 'own-code' })).status).toBe(503)
  })
})
describe('notification identity binding', () => {
  it('does not classify a failed WeChat code exchange as an expired app session', async () => {
    const service = createAuthService({ repositories: {}, tokenService: {}, providers: { wechat_mini_program: { exchange: async () => { throw Object.assign(new Error('invalid code'), { status: 401 }) } } }, identityHashKey: 'test-key' })
    await expect(service.resolveProviderSubject('user', 'wechat_mini_program', 'stale-code')).rejects.toMatchObject({ status: 400, code: 'NOTIFICATION_PROVIDER_AUTH_FAILED' })
  })
  it.each([true, false])('only resolves a provider subject belonging to the authenticated user: %s', async matches => {
    const repositories = { identityBelongsToUser: vi.fn(async () => matches) }
    const service = createAuthService({ repositories, tokenService: {}, providers: { wechat_mini_program: { exchange: async () => ({ provider: 'wechat_mini_program', subject: 'wx-openid' }) } }, identityHashKey: 'test-key' })
    const result = service.resolveProviderSubject('user', 'wechat_mini_program', 'fresh-code')
    if (matches) expect(await result).toBe('wx-openid')
    else await expect(result).rejects.toMatchObject({ status: 403, code: 'NOTIFICATION_IDENTITY_MISMATCH' })
    expect(repositories.identityBelongsToUser).toHaveBeenCalledWith('user', 'wechat_mini_program', createHmac('sha256', 'test-key').update('wechat_mini_program:wx-openid').digest('hex'))
  })
})

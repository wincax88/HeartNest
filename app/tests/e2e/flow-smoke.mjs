import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createApi } from '../../server/app.mjs'
import { createAuthService } from '../../server/auth/service.mjs'
import { createTokenService } from '../../server/auth/tokens.mjs'
import { createPool } from '../../server/db/client.mjs'
import { runMigrations } from '../../server/db/migrate.mjs'
import { createRepositories } from '../../server/db/repositories.mjs'
import { createPrivacyService } from '../../server/privacy.mjs'
import { createEntitlementService } from '../../server/entitlements.mjs'
import { createPaymentService } from '../../server/payments/service.mjs'
import { createNotificationService } from '../../server/notifications/service.mjs'
import { createContentService } from '../../server/content.mjs'
import { createAvatarService } from '../../server/avatars.mjs'
import { createStore } from '../../server/store.mjs'
import { createE2EAdapters } from './test-adapters.mjs'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for isolated E2E')
const pool = createPool(databaseUrl)
const directory = await mkdtemp(join(tmpdir(), 'heartnest-e2e-'))
let server

try {
  await runMigrations(pool)
  const repositories = createRepositories(pool)
  const adapters = createE2EAdapters({ nodeEnv: 'test' })
  const authService = createAuthService({ repositories, tokenService: createTokenService({ signingKey: 'e2e-signing-key-at-least-32-bytes' }), providers: adapters.providers, identityHashKey: 'e2e-identity-key' })
  const privacyService = createPrivacyService({ repositories, versions: { privacyVersion: '2026-09-30', termsVersion: '2026-09-30', aiVersion: '2026-09-30' } })
  const app = createApi({
    store: createStore(join(directory, 'heartnest.json')), responder: adapters.responder, authService, privacyService,
    entitlementService: createEntitlementService({ repositories }),
    paymentService: createPaymentService({ repositories, adapter: adapters.payment }),
    notificationService: createNotificationService({ repositories }),
    contentService: createContentService({ repositories, avatarOrigins: ['https://cdn.heartnest.test'] }), repositories,
    avatarService: createAvatarService({ repositories }),
  })
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api`
  const request = (path, options = {}, token = null) => fetch(`${base}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers } })
  const identity = `e2e-${randomUUID()}`
  const login = await request('/auth/provider', { method: 'POST', body: JSON.stringify({ provider: 'wechat_mini_program', code: identity }) })
  if (!login.ok) throw new Error(`E2E login failed: ${login.status}`)
  const session = await login.json()
  const token = session.accessToken
  await request('/privacy/consents', { method: 'POST', body: JSON.stringify({ privacyVersion: '2026-09-30', termsVersion: '2026-09-30', aiVersion: '2026-09-30' }) }, token)

  const clientMessageId = `retry-${randomUUID()}`
  const messageBody = JSON.stringify({ text: '请测试重试', moodId: 'calm', clientMessageId })
  const failed = await request('/chats/mika/messages', { method: 'POST', body: messageBody }, token)
  if (failed.status !== 500) throw new Error(`Expected first model attempt to fail, got ${failed.status}`)
  const retried = await request('/chats/mika/messages', { method: 'POST', body: messageBody }, token)
  if (retried.status !== 201) throw new Error(`Retry failed: ${retried.status}`)
  const chat = await retried.json()
  if (chat.userMessage.clientMessageId !== clientMessageId) throw new Error('Retry did not preserve client message id')

  const favorite = await request('/favorites', { method: 'POST', body: JSON.stringify({ messageId: chat.userMessage.id }) }, token)
  if (favorite.status !== 201) throw new Error(`Favorite failed: ${favorite.status}; message=${JSON.stringify(chat.userMessage)}; body=${await favorite.text()}`)
  const favorites = await request('/favorites', {}, token).then((response) => response.json())
  if (favorites.length !== 1) throw new Error('Favorite was not persisted')
  const image = await sharp({ create: { width: 24, height: 32, channels: 3, background: '#be8fac' } }).jpeg().toBuffer()
  const avatarForm = new FormData()
  avatarForm.append('avatar', new Blob([image], { type: 'image/jpeg' }), 'avatar.jpg')
  const uploaded = await fetch(`${base}/profile/avatar`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: avatarForm })
  if (uploaded.status !== 201) throw new Error(`Avatar upload failed: ${uploaded.status}`)
  const { avatarUrl } = await uploaded.json()
  const profile = await request('/profile', { method: 'PATCH', body: JSON.stringify({ displayName: 'E2E 用户', avatarUrl }) }, token)
  const savedProfile = await profile.json()
  if (!profile.ok || savedProfile.displayName !== 'E2E 用户' || savedProfile.avatar !== avatarUrl) throw new Error('Profile update failed')
  const publishedAvatar = await fetch(`${base.slice(0, -4)}${avatarUrl}`)
  if (!publishedAvatar.ok || publishedAvatar.headers.get('content-type') !== 'image/webp' || !(await publishedAvatar.arrayBuffer()).byteLength) throw new Error('Saved avatar is unavailable')

  const deviceToken = `device-${identity}`
  await request('/notifications/devices', { method: 'POST', body: JSON.stringify({ platform: 'app', token: deviceToken }) }, token)
  const reminder = await request('/reminders', { method: 'POST', body: JSON.stringify({ channel: 'app', time: '20:30', timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00', target: { token: deviceToken }, payload: { title: 'E2E' } }) }, token)
  if (reminder.status !== 201) throw new Error(`Reminder creation failed: ${reminder.status}`)

  const orderResponse = await request('/payments/orders', { method: 'POST', body: JSON.stringify({ productId: 'heartnest-pro-monthly', clientType: 'app' }) }, token)
  if (orderResponse.status !== 201) throw new Error(`Payment order failed: ${orderResponse.status}`)
  const order = await orderResponse.json()
  const callback = await request('/payments/wechat/callback', { method: 'POST', body: JSON.stringify({ event: { merchantOrderNo: order.merchantOrderNo, platformTransactionId: `wx-${identity}`, amount: 1800, currency: 'CNY', status: 'SUCCESS' } }) })
  if (callback.status !== 204) throw new Error(`Payment callback failed: ${callback.status}`)
  const paid = await request(`/payments/orders/${order.id}`, {}, token).then((response) => response.json())
  if (paid.status !== 'paid') throw new Error('Verified callback did not grant membership')

  await pool.query('DELETE FROM users WHERE id = $1', [session.userId])
  console.log('HeartNest isolated end-to-end behavior passed.')
} finally {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await pool.end()
  await rm(directory, { recursive: true, force: true })
}

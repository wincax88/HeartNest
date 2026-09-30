import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import { createApi } from './app.mjs'
import { createDeepSeekResponder } from './ai.mjs'
import { createWechatProviderRegistry } from './auth/providers.mjs'
import { createAuthService } from './auth/service.mjs'
import { createTokenService } from './auth/tokens.mjs'
import { loadConfig } from './config.mjs'
import { createPool } from './db/client.mjs'
import { runMigrations } from './db/migrate.mjs'
import { createRepositories } from './db/repositories.mjs'
import { createPrivacyService } from './privacy.mjs'
import { createEntitlementService } from './entitlements.mjs'
import { createPaymentService } from './payments/service.mjs'
import { createWechatPayAdapter } from './payments/wechat.mjs'
import { createNotificationService } from './notifications/service.mjs'
import { createNotificationWorker } from './notifications/worker.mjs'
import { createWechatNotificationAdapter } from './notifications/wechat.mjs'
import { createAppPushAdapter } from './notifications/app-push.mjs'
import { createContentService } from './content.mjs'
import { createSafeResponder } from './safety.mjs'
import { createStore } from './store.mjs'

const config = loadConfig()
const port = Number(process.env.PORT || 8787)
const dataFile = resolve(process.env.HEARTNEST_DATA_FILE || './data/heartnest.json')
const pool = config.databaseUrl ? createPool(config.databaseUrl) : null
if (pool) await runMigrations(pool)
const repositories = pool ? createRepositories(pool) : null
const authService = pool ? createAuthService({
  repositories,
  tokenService: createTokenService({ signingKey: config.tokenSigningKey }),
  providers: createWechatProviderRegistry(config.wechat),
  identityHashKey: config.dataEncryptionKey,
}) : null
const privacyService = repositories ? createPrivacyService({
  repositories,
  versions: { privacyVersion: '2026-09-30', termsVersion: '2026-09-30', aiVersion: '2026-09-30' },
}) : null
const entitlementService = repositories ? createEntitlementService({ repositories }) : null
const paymentService = repositories ? createPaymentService({
  repositories,
  adapter: createWechatPayAdapter(config.wechatPay),
}) : null
const notificationService = repositories ? createNotificationService({ repositories }) : null
const notificationWorker = repositories ? createNotificationWorker({
  repositories,
  adapters: {
    wechat: createWechatNotificationAdapter({ appId: config.wechat.miniAppId, appSecret: config.wechat.miniSecret }),
    app: createAppPushAdapter(config.appPush),
  },
}) : null
const contentService = repositories ? createContentService({
  repositories,
  avatarOrigins: (process.env.AVATAR_ALLOWED_ORIGINS || 'https://heartnest-ns-i61rahoe.gzg.sealos.run').split(',').map((value) => value.trim()).filter(Boolean),
}) : null
const responder = createDeepSeekResponder()
const safeResponder = createSafeResponder({ responder })
const app = createApi({ store: createStore(dataFile), responder, safeResponder, authService, privacyService, entitlementService, paymentService, notificationService, contentService, repositories })
const staticRoot = resolve(process.env.HEARTNEST_STATIC_ROOT || './dist/build/h5')

if (notificationWorker) {
  const notificationTimer = setInterval(() => {
    notificationWorker.runBatch().catch((error) => console.error('Notification worker failed:', error.message))
  }, 30_000)
  notificationTimer.unref()
}

if (existsSync(staticRoot)) {
  app.use(express.static(staticRoot, { index: 'index.html', maxAge: '1h' }))
  app.get('*', (_req, res) => res.sendFile(resolve(staticRoot, 'index.html')))
}

app.listen(port, '0.0.0.0', () => {
  console.log(`HeartNest API listening on http://0.0.0.0:${port} (${config.nodeEnv})`)
})

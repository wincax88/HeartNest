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
import { createStore } from './store.mjs'

const config = loadConfig()
const port = Number(process.env.PORT || 8787)
const dataFile = resolve(process.env.HEARTNEST_DATA_FILE || './data/heartnest.json')
const pool = config.databaseUrl ? createPool(config.databaseUrl) : null
if (pool) await runMigrations(pool)
const authService = pool ? createAuthService({
  repositories: createRepositories(pool),
  tokenService: createTokenService({ signingKey: config.tokenSigningKey }),
  providers: createWechatProviderRegistry(config.wechat),
  identityHashKey: config.dataEncryptionKey,
}) : null
const app = createApi({ store: createStore(dataFile), responder: createDeepSeekResponder(), authService })
const staticRoot = resolve(process.env.HEARTNEST_STATIC_ROOT || './dist/build/h5')

if (existsSync(staticRoot)) {
  app.use(express.static(staticRoot, { index: 'index.html', maxAge: '1h' }))
  app.get('*', (_req, res) => res.sendFile(resolve(staticRoot, 'index.html')))
}

app.listen(port, '0.0.0.0', () => {
  console.log(`HeartNest API listening on http://0.0.0.0:${port} (${config.nodeEnv})`)
})

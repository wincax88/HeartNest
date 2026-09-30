import { createServer } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApi } from '../../server/app.mjs'
import { createAuthService } from '../../server/auth/service.mjs'
import { createTestProviderRegistry } from '../../server/auth/providers.mjs'
import { createTokenService } from '../../server/auth/tokens.mjs'
import { createPool } from '../../server/db/client.mjs'
import { runMigrations } from '../../server/db/migrate.mjs'
import { createRepositories } from '../../server/db/repositories.mjs'

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)('authenticated API', () => {
  let pool
  let repositories
  let server
  let base

  beforeAll(async () => {
    pool = createPool(databaseUrl)
    await runMigrations(pool)
    repositories = createRepositories(pool)
  })

  beforeEach(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await pool.query('TRUNCATE TABLE sessions, user_identities, users RESTART IDENTITY CASCADE')
    const tokenService = createTokenService({
      signingKey: 'integration-signing-key-32-bytes!',
      issuer: 'heartnest-test',
      audience: 'heartnest-client',
    })
    const authService = createAuthService({
      repositories,
      tokenService,
      providers: createTestProviderRegistry({ nodeEnv: 'test' }),
      identityHashKey: 'integration-identity-key',
    })
    const store = {
      bootstrap: async (userId) => ({ profile: { id: userId } }),
    }
    const app = createApi({ store, responder: async () => 'ok', authService })
    server = createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${server.address().port}/api`
  })

  afterAll(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await pool?.end()
  })

  async function login(code = 'valid-code') {
    const response = await fetch(`${base}/auth/provider`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'wechat_mini_program', code }),
    })
    expect(response.status).toBe(200)
    return response.json()
  }

  it('rotates refresh tokens and rejects replay', async () => {
    const first = await login()
    const refreshResponse = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: first.refreshToken }),
    })
    expect(refreshResponse.status).toBe(200)
    const rotated = await refreshResponse.json()
    expect(rotated.refreshToken).not.toBe(first.refreshToken)

    const replay = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: first.refreshToken }),
    })
    expect(replay.status).toBe(401)
    expect((await replay.json()).error.code).toBe('REFRESH_TOKEN_REUSED')
  })

  it('does not accept X-HeartNest-Device as authorization', async () => {
    const response = await fetch(`${base}/bootstrap`, {
      headers: { 'x-heartnest-device': 'device-api-test-0001' },
    })
    expect(response.status).toBe(401)
    expect((await response.json()).error.code).toBe('AUTH_REQUIRED')
  })

  it('uses the verified access token identity for protected data', async () => {
    const session = await login('another-code')
    const response = await fetch(`${base}/bootstrap`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    })
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.profile.id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

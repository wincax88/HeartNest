import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApi } from '../../server/app.mjs'
import { createTestProviderRegistry } from '../../server/auth/providers.mjs'
import { createAuthService } from '../../server/auth/service.mjs'
import { createTokenService } from '../../server/auth/tokens.mjs'
import { createPool } from '../../server/db/client.mjs'
import { runMigrations } from '../../server/db/migrate.mjs'
import { createRepositories } from '../../server/db/repositories.mjs'
import { createPrivacyService } from '../../server/privacy.mjs'
import { createStore } from '../../server/store.mjs'

const databaseUrl = process.env.DATABASE_URL
const versions = { privacyVersion: '2026-09-30', termsVersion: '2026-09-30', aiVersion: '2026-09-30' }

describe.skipIf(!databaseUrl)('privacy controls', () => {
  let pool
  let repositories
  let privacyService
  let server
  let base
  let directory

  beforeAll(async () => {
    pool = createPool(databaseUrl)
    await runMigrations(pool)
    repositories = createRepositories(pool)
  })

  beforeEach(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    if (directory) await rm(directory, { recursive: true, force: true })
    await pool.query('TRUNCATE TABLE data_exports, consents, sessions, user_identities, users RESTART IDENTITY CASCADE')
    directory = await mkdtemp(join(tmpdir(), 'heartnest-privacy-'))
    const authService = createAuthService({
      repositories,
      tokenService: createTokenService({ signingKey: 'privacy-integration-signing-key!!' }),
      providers: createTestProviderRegistry({ nodeEnv: 'test' }),
      identityHashKey: 'privacy-identity-key',
    })
    privacyService = createPrivacyService({ repositories, versions })
    const app = createApi({
      store: createStore(join(directory, 'heartnest.json')),
      responder: async () => '我在这里。',
      authService,
      privacyService,
    })
    server = createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${server.address().port}/api`
  })

  afterAll(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    if (directory) await rm(directory, { recursive: true, force: true })
    await pool?.end()
  })

  async function login(code) {
    const response = await fetch(`${base}/auth/provider`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'wechat_mini_program', code }),
    })
    return response.json()
  }

  const authorized = (token, path, options = {}) => fetch(`${base}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...options.headers },
  })

  it('requires current consent before AI chat', async () => {
    const user = await login('consent-user')
    const body = JSON.stringify({ text: 'hello', moodId: 'calm', clientMessageId: 'privacy-message-1' })
    const blocked = await authorized(user.accessToken, '/chats/mika/messages', { method: 'POST', body })
    expect(blocked.status).toBe(403)
    expect((await blocked.json()).error.code).toBe('CONSENT_REQUIRED')

    const accepted = await authorized(user.accessToken, '/privacy/consents', { method: 'POST', body: JSON.stringify(versions) })
    expect(accepted.status).toBe(201)
    const sent = await authorized(user.accessToken, '/chats/mika/messages', { method: 'POST', body })
    expect(sent.status).toBe(201)
  })

  it('allows cancellation during the seven-day deletion cooling period', async () => {
    const user = await login('deletion-user')
    const requested = await authorized(user.accessToken, '/account/deletion', { method: 'POST' })
    expect(requested.status).toBe(202)
    expect((await requested.json()).status).toBe('deletion_pending')

    const cancelled = await authorized(user.accessToken, '/account/deletion', { method: 'DELETE' })
    expect(cancelled.status).toBe(200)
    expect((await cancelled.json()).status).toBe('active')
  })

  it('never exposes an export to another user and consumes the token once', async () => {
    const alice = await login('export-alice')
    const bob = await login('export-bob')
    const created = await authorized(alice.accessToken, '/privacy/exports', { method: 'POST' })
    expect(created.status).toBe(201)
    const exported = await created.json()

    const denied = await authorized(bob.accessToken, `/privacy/exports/${exported.id}?token=${exported.downloadToken}`)
    expect(denied.status).toBe(404)
    const downloaded = await authorized(alice.accessToken, `/privacy/exports/${exported.id}?token=${exported.downloadToken}`)
    expect(downloaded.status).toBe(200)
    const replay = await authorized(alice.accessToken, `/privacy/exports/${exported.id}?token=${exported.downloadToken}`)
    expect(replay.status).toBe(410)
  })

  it('physically deletes only accounts whose cooling period has elapsed', async () => {
    const due = await login('due-deletion')
    const pending = await login('pending-deletion')
    await repositories.requestDeletion(due.userId, new Date(Date.now() - 1_000))
    await repositories.requestDeletion(pending.userId, new Date(Date.now() + 86_400_000))

    const result = await privacyService.deleteDueAccounts(new Date())
    expect(result.deleted).toBe(1)
    const remaining = await pool.query('SELECT id FROM users ORDER BY id')
    expect(remaining.rows.map((row) => row.id)).toContain(pending.userId)
    expect(remaining.rows.map((row) => row.id)).not.toContain(due.userId)
  })
})

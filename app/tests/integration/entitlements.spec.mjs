import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../server/db/client.mjs'
import { runMigrations } from '../../server/db/migrate.mjs'
import { createRepositories } from '../../server/db/repositories.mjs'
import { createEntitlementService } from '../../server/entitlements.mjs'

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)('membership entitlements', () => {
  let pool
  let repositories
  let service
  let user

  beforeAll(async () => {
    pool = createPool(databaseUrl)
    await runMigrations(pool)
    repositories = createRepositories(pool)
    service = createEntitlementService({ repositories })
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
    user = await repositories.createUser()
    await pool.query('INSERT INTO memberships (user_id, tier) VALUES ($1, $2)', [user.id, 'free'])
    await pool.query("UPDATE plan_catalog SET limit_value = 1 WHERE plan_id = 'free' AND capability = 'daily_chat'")
  })

  afterAll(async () => {
    await pool?.query("UPDATE plan_catalog SET limit_value = 20 WHERE plan_id = 'free' AND capability = 'daily_chat'")
    await pool?.end()
  })

  it('allows only one of two concurrent requests for the final free chat slot', async () => {
    const results = await Promise.allSettled([
      service.consume(user.id, 'daily_chat', { referenceId: 'message-a' }),
      service.consume(user.id, 'daily_chat', { referenceId: 'message-b' }),
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected.reason).toMatchObject({ status: 429, code: 'DAILY_CHAT_QUOTA' })
  })

  it('does not consume quota twice for the same client message id', async () => {
    const first = await service.consume(user.id, 'daily_chat', { referenceId: 'same-message' })
    const replay = await service.consume(user.id, 'daily_chat', { referenceId: 'same-message' })

    expect(replay).toEqual(first)
    expect(replay.remaining).toBe(0)
  })

  it('returns unlimited chat access for active pro membership', async () => {
    await pool.query("UPDATE memberships SET tier = 'pro', ends_at = $2 WHERE user_id = $1", [user.id, new Date(Date.now() + 86_400_000)])

    const entitlements = await service.forUser(user.id)

    expect(entitlements.plan).toBe('pro')
    expect(entitlements.capabilities.daily_chat.limit).toBeNull()
  })
})

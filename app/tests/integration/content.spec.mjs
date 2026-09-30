import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../server/db/client.mjs'
import { runMigrations } from '../../server/db/migrate.mjs'
import { createRepositories } from '../../server/db/repositories.mjs'
import { createContentService } from '../../server/content.mjs'

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)('user content', () => {
  let pool
  let repositories
  let service
  let alice
  let bob
  let aliceMessage

  beforeAll(async () => {
    pool = createPool(databaseUrl)
    await runMigrations(pool)
    repositories = createRepositories(pool)
    service = createContentService({ repositories, avatarOrigins: ['https://cdn.heartnest.test'] })
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
    alice = await repositories.createUser({ displayName: 'Alice' })
    bob = await repositories.createUser({ displayName: 'Bob' })
    aliceMessage = await repositories.insertMessage(alice.id, 'mika', { clientMessageId: 'alice-message', content: '只属于 Alice' })
  })

  afterAll(async () => pool?.end())

  it('keeps favorites idempotent and denies another user message', async () => {
    const favorite = await service.favoriteMessage(alice.id, aliceMessage.id)
    expect(await service.favoriteMessage(alice.id, aliceMessage.id)).toEqual(favorite)
    await expect(service.favoriteMessage(bob.id, aliceMessage.id)).rejects.toMatchObject({ status: 404, code: 'MESSAGE_NOT_FOUND' })
    expect(await service.listFavorites(alice.id)).toHaveLength(1)
  })

  it('filters mood records by inclusive dates and mood', async () => {
    await pool.query(
      `INSERT INTO mood_records (user_id, mood_id, recorded_at) VALUES
       ($1, 'calm', '2026-09-01T00:00:00Z'), ($1, 'sad', '2026-09-15T00:00:00Z'),
       ($1, 'calm', '2026-09-30T23:59:59Z'), ($1, 'calm', '2026-10-01T00:00:00Z')`,
      [alice.id],
    )
    expect(await service.review(alice.id, { from: '2026-09-01', to: '2026-09-30' })).toHaveLength(3)
    expect(await service.review(alice.id, { from: '2026-09-01', to: '2026-09-30', mood: 'calm' })).toHaveLength(2)
  })

  it('validates profile names and avatar origins', async () => {
    await expect(service.updateProfile(alice.id, { displayName: '' })).rejects.toMatchObject({ code: 'INVALID_DISPLAY_NAME' })
    await expect(service.updateProfile(alice.id, { displayName: 'Alice', avatarUrl: 'https://evil.test/a.png' })).rejects.toMatchObject({ code: 'INVALID_AVATAR_URL' })
    const profile = await service.updateProfile(alice.id, { displayName: '小爱', avatarUrl: 'https://cdn.heartnest.test/a.png' })
    expect(profile.displayName).toBe('小爱')
  })
})

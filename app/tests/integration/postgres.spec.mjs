import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../server/db/client.mjs'
import { runMigrations } from '../../server/db/migrate.mjs'
import { createRepositories } from '../../server/db/repositories.mjs'

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)('PostgreSQL repositories', () => {
  let pool
  let repositories

  beforeAll(async () => {
    pool = createPool(databaseUrl)
    await runMigrations(pool)
    repositories = createRepositories(pool)
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE chat_messages, chat_threads, users RESTART IDENTITY CASCADE')
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('isolates records by authenticated user and enforces message idempotency', async () => {
    const alice = await repositories.createUser({ displayName: 'Alice' })
    const bob = await repositories.createUser({ displayName: 'Bob' })
    const clientMessageId = randomUUID()

    const aliceMessage = await repositories.insertMessage(alice.id, 'mika', {
      clientMessageId,
      content: 'A',
    })
    const bobMessage = await repositories.insertMessage(bob.id, 'mika', {
      clientMessageId,
      content: 'B',
    })

    expect(aliceMessage.content).toBe('A')
    expect(bobMessage.content).toBe('B')
    await expect(repositories.insertMessage(alice.id, 'mika', {
      clientMessageId,
      content: 'changed',
    })).rejects.toMatchObject({ code: 'MESSAGE_ID_CONFLICT' })
  })

  it('returns the existing message for an identical retry', async () => {
    const user = await repositories.createUser({ displayName: 'Retry User' })
    const clientMessageId = randomUUID()
    const first = await repositories.insertMessage(user.id, 'mika', {
      clientMessageId,
      content: 'same content',
    })
    const retried = await repositories.insertMessage(user.id, 'mika', {
      clientMessageId,
      content: 'same content',
    })

    expect(retried.id).toBe(first.id)
  })
})

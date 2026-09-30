import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../server/db/client.mjs'
import { migrateJson } from '../../server/migrate-json.mjs'
import { runMigrations } from '../../server/db/migrate.mjs'

const databaseUrl = process.env.DATABASE_URL
const fixturePath = fileURLToPath(new URL('../fixtures/heartnest-v1.json', import.meta.url))

describe.skipIf(!databaseUrl)('legacy JSON migration', () => {
  let pool

  beforeAll(async () => {
    pool = createPool(databaseUrl)
    await runMigrations(pool)
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE guest_claims, users RESTART IDENTITY CASCADE')
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('imports each JSON user once and produces a matching summary', async () => {
    const first = await migrateJson({ filePath: fixturePath, pool })
    const second = await migrateJson({ filePath: fixturePath, pool })

    expect(first).toMatchObject({
      users: 1,
      skippedUsers: 0,
      messages: 2,
      memories: 1,
    })
    expect(second).toMatchObject({
      users: 0,
      skippedUsers: 1,
      messages: 0,
      memories: 0,
    })
  })

  it('reports a dry run without writing records', async () => {
    const result = await migrateJson({ filePath: fixturePath, pool, dryRun: true })
    const users = await pool.query('SELECT count(*)::int AS count FROM users')

    expect(result).toMatchObject({ users: 1, messages: 2, memories: 1, dryRun: true })
    expect(users.rows[0].count).toBe(0)
  })
})

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../server/db/client.mjs'
import { runMigrations } from '../../server/db/migrate.mjs'
import { createRepositories } from '../../server/db/repositories.mjs'
import { createNotificationService } from '../../server/notifications/service.mjs'

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)('notification persistence', () => {
  let pool
  let repositories
  let service
  let user

  beforeAll(async () => {
    pool = createPool(databaseUrl)
    await runMigrations(pool)
    repositories = createRepositories(pool)
    service = createNotificationService({ repositories, clock: () => new Date('2026-09-30T10:00:00Z') })
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
    user = await repositories.createUser()
    await repositories.upsertNotificationDevice(user.id, { platform: 'app', token: 'device-token', status: 'active' })
  })

  afterAll(async () => pool?.end())

  it('claims a due job only once across concurrent workers', async () => {
    const schedule = await service.createSchedule(user.id, {
      channel: 'app', time: '20:30', timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00',
      target: { token: 'device-token' }, payload: { title: '晚安提醒' },
    })
    await pool.query('UPDATE reminder_schedules SET next_delivery_at = $2 WHERE id = $1', [schedule.id, new Date('2026-09-30T09:00:00Z')])
    await repositories.enqueueDueReminderJobs(new Date('2026-09-30T10:00:00Z'))

    const [first, second] = await Promise.all([
      repositories.claimNotificationJobs(10, new Date('2026-09-30T10:00:00Z')),
      repositories.claimNotificationJobs(10, new Date('2026-09-30T10:00:00Z')),
    ])

    expect([...first, ...second]).toHaveLength(1)
  })

  it('rejects a schedule after the device authorization is revoked', async () => {
    await repositories.upsertNotificationDevice(user.id, { platform: 'app', token: 'device-token', status: 'revoked' })

    await expect(service.createSchedule(user.id, {
      channel: 'app', time: '20:30', timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00',
      target: { token: 'device-token' }, payload: {},
    })).rejects.toMatchObject({ status: 403, code: 'NOTIFICATION_AUTH_REQUIRED' })
  })
})

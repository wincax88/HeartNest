import { describe, expect, it, vi } from 'vitest'
import { nextDelivery } from '../../server/notifications/service.mjs'
import { createNotificationWorker } from '../../server/notifications/worker.mjs'

describe('notification scheduling', () => {
  it('moves a reminder outside an overnight quiet window', () => {
    const schedule = { time: '22:30', timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00' }

    expect(nextDelivery(schedule, new Date('2026-09-30T14:25:00Z')))
      .toEqual(new Date('2026-10-01T00:00:00.000Z'))
  })

  it('keeps a daytime reminder in the configured timezone', () => {
    const schedule = { time: '20:30', timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00' }

    expect(nextDelivery(schedule, new Date('2026-09-30T10:00:00Z')))
      .toEqual(new Date('2026-09-30T12:30:00.000Z'))
  })

  it('records a dead letter after the bounded final retry', async () => {
    const job = { id: 'job-1', channel: 'app', attempts: 3, payload: { title: '晚安提醒' }, target: { token: 'device-token' } }
    const repositories = {
      markNotificationDelivered: vi.fn(),
      retryNotificationJob: vi.fn(),
      deadLetterNotificationJob: vi.fn(),
    }
    const adapter = { send: vi.fn().mockRejectedValue(new Error('upstream unavailable')) }
    const worker = createNotificationWorker({ repositories, adapters: { app: adapter }, maxAttempts: 3 })

    await worker.process(job)

    expect(repositories.deadLetterNotificationJob).toHaveBeenCalledWith('job-1', 'upstream unavailable')
    expect(repositories.retryNotificationJob).not.toHaveBeenCalled()
  })

  it('retries a transient failure before the final attempt', async () => {
    const job = { id: 'job-2', channel: 'wechat', attempts: 1, payload: {}, target: {} }
    const repositories = {
      markNotificationDelivered: vi.fn(),
      retryNotificationJob: vi.fn(),
      deadLetterNotificationJob: vi.fn(),
    }
    const worker = createNotificationWorker({
      repositories,
      adapters: { wechat: { send: vi.fn().mockRejectedValue(new Error('temporary')) } },
      maxAttempts: 3,
    })

    await worker.process(job)

    expect(repositories.retryNotificationJob).toHaveBeenCalledWith('job-2', expect.any(Date), 'temporary')
  })
})

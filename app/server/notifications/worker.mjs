export function createNotificationWorker({ repositories, adapters, maxAttempts = 3, clock = () => new Date() }) {
  return {
    async process(job) {
      const adapter = adapters[job.channel]
      if (!adapter?.configured && adapter?.configured !== undefined) {
        await repositories.deadLetterNotificationJob(job.id, 'adapter not configured')
        return
      }
      try {
        await adapter.send(job)
        await repositories.markNotificationDelivered(job.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (job.attempts >= maxAttempts) await repositories.deadLetterNotificationJob(job.id, message)
        else {
          const delayMinutes = 2 ** Math.max(0, job.attempts - 1)
          await repositories.retryNotificationJob(job.id, new Date(clock().getTime() + delayMinutes * 60_000), message)
        }
      }
    },
    async runBatch(limit = 20) {
      await repositories.enqueueDueReminderJobs?.(clock())
      const jobs = await repositories.claimNotificationJobs(limit, clock())
      for (const job of jobs) await this.process(job)
      return jobs.length
    },
  }
}

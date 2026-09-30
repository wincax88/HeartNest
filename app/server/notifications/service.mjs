function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
}

function addLocalDays(parts, days) {
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() }
}

function zonedDate(parts, timeZone) {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  let guess = desired
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = localParts(new Date(guess), timeZone)
    const actualValue = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute)
    guess += desired - actualValue
  }
  return new Date(guess)
}

function parseTime(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) throw Object.assign(new Error('提醒时间无效'), { status: 400, code: 'INVALID_REMINDER_TIME' })
  const [hour, minute] = value.split(':').map(Number)
  return { hour, minute, total: hour * 60 + minute }
}

export function nextDelivery(schedule, now = new Date()) {
  const zone = schedule.timeZone || 'Asia/Shanghai'
  const time = parseTime(schedule.time)
  const quietStart = parseTime(schedule.quietStart || '22:00')
  const quietEnd = parseTime(schedule.quietEnd || '08:00')
  let day = localParts(now, zone)
  let candidate = zonedDate({ ...day, hour: time.hour, minute: time.minute }, zone)
  if (candidate <= now) {
    day = { ...day, ...addLocalDays(day, 1) }
    candidate = zonedDate({ ...day, hour: time.hour, minute: time.minute }, zone)
  }

  const insideQuiet = quietStart.total < quietEnd.total
    ? time.total >= quietStart.total && time.total < quietEnd.total
    : time.total >= quietStart.total || time.total < quietEnd.total
  if (insideQuiet) {
    if (quietStart.total >= quietEnd.total && time.total >= quietStart.total) day = { ...day, ...addLocalDays(day, 1) }
    candidate = zonedDate({ ...day, hour: quietEnd.hour, minute: quietEnd.minute }, zone)
  }
  return candidate
}

export function createNotificationService({ repositories, clock = () => new Date() }) {
  async function requireAuthorizedTarget(userId, input) {
    if (!['wechat', 'app'].includes(input.channel)) throw Object.assign(new Error('提醒渠道无效'), { status: 400, code: 'INVALID_NOTIFICATION_CHANNEL' })
    const authorized = await repositories.notificationTargetAuthorized(userId, input.channel, input.target || {})
    if (!authorized) throw Object.assign(new Error('通知授权已失效'), { status: 403, code: 'NOTIFICATION_AUTH_REQUIRED' })
  }

  return {
    registerDevice: (userId, input) => repositories.upsertNotificationDevice(userId, input),
    authorizeTemplate: (userId, input) => repositories.upsertNotificationAuthorization(userId, input),
    listSchedules: (userId) => repositories.listReminderSchedules(userId),
    async createSchedule(userId, input) {
      await requireAuthorizedTarget(userId, input)
      const next = nextDelivery(input, clock())
      return repositories.createReminderSchedule(userId, { ...input, nextDeliveryAt: next })
    },
    async updateSchedule(userId, scheduleId, input) {
      await requireAuthorizedTarget(userId, input)
      const next = nextDelivery(input, clock())
      return repositories.updateReminderSchedule(userId, scheduleId, { ...input, nextDeliveryAt: next })
    },
    deleteSchedule: (userId, scheduleId) => repositories.deleteReminderSchedule(userId, scheduleId),
  }
}

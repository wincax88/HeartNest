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

export function createNotificationService({ repositories, clock = () => new Date(), wechatReminder = {}, resolveWechatSubject = null, appEnabled = true }) {
  const wechatEnabled = Boolean(wechatReminder.templateId && wechatReminder.data && resolveWechatSubject)
  const error = (status, code, message) => Object.assign(new Error(message), { status, code })
  function requireWechatConfigured() {
    if (!wechatEnabled) throw error(503, 'WECHAT_REMINDER_NOT_CONFIGURED', '微信提醒暂未开通，请稍后再试')
  }
  async function prepareSchedule(userId, input) {
    const next = nextDelivery(input, clock())
    if (input.channel !== 'wechat') return { ...input, nextDeliveryAt: next }
    requireWechatConfigured()
    const authorization = await repositories.getNotificationAuthorization(userId, wechatReminder.templateId)
    if (!authorization?.subject) throw error(403, 'NOTIFICATION_AUTH_REQUIRED', '请先允许微信订阅提醒，再保存')
    const formattedTime = new Intl.DateTimeFormat('sv-SE', { timeZone: input.timeZone || 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(next)
    const payload = Object.fromEntries(Object.entries(wechatReminder.data).map(([key, field]) => [key, { value: field.value.replaceAll('{{time}}', formattedTime) }]))
    return { ...input, nextDeliveryAt: next, payload, target: { templateId: wechatReminder.templateId, openId: authorization.subject, page: 'pages/home/index' } }
  }
  async function requireAuthorizedTarget(userId, input) {
    if (!['wechat', 'app'].includes(input.channel)) throw Object.assign(new Error('提醒渠道无效'), { status: 400, code: 'INVALID_NOTIFICATION_CHANNEL' })
    if (input.channel === 'wechat') {
      requireWechatConfigured()
      if (input.target?.templateId !== wechatReminder.templateId) throw error(400, 'INVALID_NOTIFICATION_TEMPLATE', '提醒模板已更新，请重新打开页面')
    } else if (!appEnabled) throw error(503, 'APP_PUSH_NOT_CONFIGURED', 'App 提醒暂未开通，请稍后再试')
    const authorized = await repositories.notificationTargetAuthorized(userId, input.channel, input.target || {})
    if (!authorized) throw error(403, 'NOTIFICATION_AUTH_REQUIRED', '请先允许提醒通知，再保存')
  }

  return {
    configuration: () => ({ wechat: { available: wechatEnabled, templateId: wechatEnabled ? wechatReminder.templateId : null }, app: { available: appEnabled } }),
    registerDevice: (userId, input) => {
      if (!appEnabled) throw error(503, 'APP_PUSH_NOT_CONFIGURED', 'App 提醒暂未开通，请稍后再试')
      if (input.platform !== 'app' || typeof input.token !== 'string' || !input.token.trim()) throw error(400, 'INVALID_NOTIFICATION_DEVICE', '请重新授权设备通知')
      return repositories.upsertNotificationDevice(userId, input)
    },
    async authorizeTemplate(userId, input) {
      requireWechatConfigured()
      if (input.channel !== 'wechat' || input.templateId !== wechatReminder.templateId) throw error(400, 'INVALID_NOTIFICATION_TEMPLATE', '提醒模板已更新，请重新打开页面')
      const subject = await resolveWechatSubject(userId, input.code)
      return repositories.upsertNotificationAuthorization(userId, { channel: 'wechat', templateId: wechatReminder.templateId, subject, status: 'authorized' })
    },
    listSchedules: (userId) => repositories.listReminderSchedules(userId),
    async createSchedule(userId, input) {
      await requireAuthorizedTarget(userId, input)
      return repositories.createReminderSchedule(userId, await prepareSchedule(userId, input))
    },
    async updateSchedule(userId, scheduleId, input) {
      await requireAuthorizedTarget(userId, input)
      return repositories.updateReminderSchedule(userId, scheduleId, await prepareSchedule(userId, input))
    },
    deleteSchedule: (userId, scheduleId) => repositories.deleteReminderSchedule(userId, scheduleId),
  }
}

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { companions, moods } from './catalog.mjs'

const DAY = 86_400_000

function defaultUser(now = new Date()) {
  const timestamp = now.toISOString()
  return {
    createdAt: timestamp,
    lastSeenAt: timestamp,
    profile: { displayName: '新朋友', preferredCompanionId: 'mika' },
    membership: { tier: 'free', title: '心栖体验', benefits: ['每日对话', '近 7 日回顾', '用户授权的记忆'] },
    preferences: { notificationsEnabled: true, replyStyle: 'gentle', memoryPromptsEnabled: true, onboardingCompleted: false },
    state: { selectedMoodId: 'calm', selectedCompanionId: 'mika', onboardingCompleted: false },
    moodRecords: [],
    memories: [],
    threads: [],
    feedback: [],
  }
}

function freeMembership() {
  return { tier: 'free', title: '心栖体验', benefits: ['每日对话', '近 7 日回顾', '用户授权的记忆'] }
}

function localDay(iso) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function reviewDays(user, now = new Date()) {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now.getTime() - (6 - offset) * DAY)
    const day = localDay(date.toISOString())
    const record = [...user.moodRecords].reverse().find((item) => localDay(item.date) === day)
    const mood = moods.find((item) => item.id === record?.moodId)
    return {
      date: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`,
      weekday: `周${'日一二三四五六'[date.getDay()]}`,
      score: mood?.score ?? 0,
      moodId: mood?.id ?? 'calm',
      label: mood?.title ?? '暂无记录',
      summary: record?.summary ?? '',
      keywords: [],
      recorded: Boolean(record),
    }
  })
}

function publicUser(user) {
  const messageCount = user.threads.reduce((sum, thread) => sum + thread.messages.filter((item) => item.sender === 'user' && item.status === 'sent').length, 0)
  const activityDaySet = new Set([
    ...user.moodRecords.map((item) => localDay(item.date)),
    ...user.threads.flatMap((thread) => thread.messages.filter((item) => item.sender === 'user').map((item) => localDay(item.createdAt))),
  ])
  const activeDays = activityDaySet.size
  let streakDays = 0
  for (let offset = 0; ; offset += 1) {
    const day = localDay(new Date(Date.now() - offset * DAY).toISOString())
    if (!activityDaySet.has(day)) break
    streakDays += 1
  }
  const companionStats = Object.fromEntries(companions.map((companion) => {
    const thread = user.threads.find((item) => item.companionId === companion.id)
    return [companion.id, { conversations: thread?.messages.filter((item) => item.sender === 'user' && item.status === 'sent').length ?? 0 }]
  }))
  return {
    companions,
    moods,
    profile: { ...user.profile, streakDays },
    membership: user.membership,
    preferences: user.preferences,
    state: user.state,
    reviewDays: reviewDays(user),
    memories: user.memories.filter((item) => item.retained),
    stats: { conversations: messageCount, memories: user.memories.filter((item) => item.retained).length, activeDays },
    companionStats,
  }
}

export function createStore(filePath) {
  let data = { version: 1, users: {} }
  let ready
  let writes = Promise.resolve()

  async function load() {
    try {
      const parsed = JSON.parse(await readFile(filePath, 'utf8'))
      if (parsed?.version === 1 && parsed.users && typeof parsed.users === 'object') data = parsed
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }

  function ensureReady() {
    ready ??= load()
    return ready
  }

  async function persist() {
    await mkdir(dirname(filePath), { recursive: true })
    const temporary = `${filePath}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify(data, null, 2), 'utf8')
    await rename(temporary, filePath)
  }

  async function update(deviceId, updater) {
    await ensureReady()
    let result
    writes = writes.catch(() => undefined).then(async () => {
      const user = data.users[deviceId] ?? defaultUser()
      data.users[deviceId] = user
      user.lastSeenAt = new Date().toISOString()
      if (user.membership.tier === 'pro' && user.membership.trialEndsAt && Date.parse(user.membership.trialEndsAt) <= Date.now()) {
        user.membership = freeMembership()
      }
      result = await updater(user)
      await persist()
    })
    await writes
    return result
  }

  return {
    async bootstrap(deviceId) {
      return update(deviceId, (user) => publicUser(user))
    },
    update,
    publicUser,
    findThread(user, companionId) {
      let thread = user.threads.find((item) => item.companionId === companionId)
      if (!thread) {
        thread = { id: randomUUID(), companionId, createdAt: new Date().toISOString(), messages: [] }
        user.threads.push(thread)
      }
      return thread
    },
  }
}

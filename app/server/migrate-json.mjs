import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createPool, withTransaction } from './db/client.mjs'
import { runMigrations } from './db/migrate.mjs'

function emptySummary(extra = {}) {
  return { users: 0, skippedUsers: 0, messages: 0, memories: 0, moods: 0, feedback: 0, ...extra }
}

function hashDeviceId(deviceId) {
  return createHash('sha256').update(deviceId).digest('hex')
}

function validDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback
  return Number.isNaN(date.getTime()) ? fallback : date
}

function sourceCounts(payload) {
  const summary = emptySummary({ dryRun: true })
  for (const user of Object.values(payload.users)) {
    summary.users += 1
    summary.messages += (user.threads ?? []).reduce((total, thread) => total + (thread.messages?.length ?? 0), 0)
    summary.memories += user.memories?.length ?? 0
    summary.moods += user.moodRecords?.length ?? 0
    summary.feedback += user.feedback?.length ?? 0
  }
  return summary
}

async function importUser(pool, deviceId, legacyUser) {
  const deviceHash = hashDeviceId(deviceId)
  return withTransaction(pool, async (client) => {
    const claimed = await client.query('SELECT 1 FROM guest_claims WHERE device_hash = $1', [deviceHash])
    if (claimed.rowCount) return emptySummary({ skippedUsers: 1 })

    const userResult = await client.query(
      `INSERT INTO users (display_name, avatar_url)
       VALUES ($1, $2)
       RETURNING id`,
      [legacyUser.profile?.displayName || '新朋友', legacyUser.profile?.avatar || null],
    )
    const userId = userResult.rows[0].id
    const preferences = legacyUser.preferences ?? {}
    await client.query(
      `INSERT INTO user_preferences
         (user_id, preferred_companion_id, notifications_enabled, reply_style, memory_prompts_enabled, onboarding_completed)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        legacyUser.profile?.preferredCompanionId || 'mika',
        preferences.notificationsEnabled !== false,
        preferences.replyStyle || 'gentle',
        preferences.memoryPromptsEnabled !== false,
        preferences.onboardingCompleted === true,
      ],
    )
    const membership = legacyUser.membership ?? {}
    await client.query(
      `INSERT INTO memberships (user_id, tier, title, benefits, ends_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [
        userId,
        membership.tier === 'pro' ? 'pro' : 'free',
        membership.title || '心栖体验',
        JSON.stringify(Array.isArray(membership.benefits) ? membership.benefits : []),
        membership.trialEndsAt ? validDate(membership.trialEndsAt) : null,
      ],
    )
    await client.query(
      `INSERT INTO guest_claims (device_hash, claimed_by, claimed_at, source_version)
       VALUES ($1, $2, now(), 1)`,
      [deviceHash, userId],
    )

    let messages = 0
    for (const thread of legacyUser.threads ?? []) {
      const threadResult = await client.query(
        `INSERT INTO chat_threads (user_id, companion_id, created_at, updated_at)
         VALUES ($1, $2, $3, $3)
         RETURNING id`,
        [userId, thread.companionId || 'mika', validDate(thread.createdAt)],
      )
      for (const message of thread.messages ?? []) {
        await client.query(
          `INSERT INTO chat_messages
             (thread_id, client_message_id, sender, content, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $6)`,
          [
            threadResult.rows[0].id,
            String(message.id).slice(0, 100),
            ['user', 'companion', 'system'].includes(message.sender) ? message.sender : 'system',
            String(message.content || ''),
            ['sending', 'sent', 'failed'].includes(message.status) ? message.status : 'sent',
            validDate(message.createdAt),
          ],
        )
        messages += 1
      }
    }

    for (const mood of legacyUser.moodRecords ?? []) {
      await client.query(
        `INSERT INTO mood_records (user_id, mood_id, summary, recorded_at, source_platform)
         VALUES ($1, $2, $3, $4, 'legacy')`,
        [userId, mood.moodId || 'calm', mood.summary || null, validDate(mood.date)],
      )
    }
    for (const memory of legacyUser.memories ?? []) {
      await client.query(
        `INSERT INTO memories (user_id, title, summary, retained, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5)`,
        [userId, memory.title || '对话片段', memory.summary || '', memory.retained !== false, validDate(memory.createdAt)],
      )
    }
    for (const item of legacyUser.feedback ?? []) {
      await client.query(
        `INSERT INTO feedback (user_id, content, status, created_at, updated_at)
         VALUES ($1, $2, 'new', $3, $3)`,
        [userId, item.content || '', validDate(item.createdAt)],
      )
    }

    return {
      users: 1,
      skippedUsers: 0,
      messages,
      memories: legacyUser.memories?.length ?? 0,
      moods: legacyUser.moodRecords?.length ?? 0,
      feedback: legacyUser.feedback?.length ?? 0,
    }
  })
}

export async function migrateJson({ filePath, pool, dryRun = false, verifyOnly = false }) {
  const payload = JSON.parse(await readFile(filePath, 'utf8'))
  if (payload?.version !== 1 || !payload.users || typeof payload.users !== 'object') {
    throw new Error('Unsupported HeartNest JSON format')
  }
  if (dryRun) return sourceCounts(payload)

  if (verifyOnly) {
    const expected = Object.keys(payload.users).length
    const hashes = Object.keys(payload.users).map(hashDeviceId)
    const actual = await pool.query('SELECT count(*)::int AS count FROM guest_claims WHERE device_hash = ANY($1::text[])', [hashes])
    return { expectedUsers: expected, importedUsers: actual.rows[0].count, verified: expected === actual.rows[0].count }
  }

  const summary = emptySummary()
  for (const [deviceId, legacyUser] of Object.entries(payload.users)) {
    const result = await importUser(pool, deviceId, legacyUser)
    for (const key of Object.keys(summary)) summary[key] += result[key] ?? 0
  }
  return summary
}

function parseArguments(argv) {
  const sourceIndex = argv.indexOf('--source')
  if (sourceIndex === -1 || !argv[sourceIndex + 1]) throw new Error('--source is required')
  return {
    filePath: resolve(argv[sourceIndex + 1]),
    dryRun: argv.includes('--dry-run'),
    verifyOnly: argv.includes('--verify-only'),
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const pool = options.dryRun ? null : createPool(process.env.DATABASE_URL)
  try {
    if (pool) await runMigrations(pool)
    const result = await migrateJson({ ...options, pool })
    console.log(JSON.stringify(result))
    if (options.verifyOnly && !result.verified) process.exitCode = 2
  } finally {
    await pool?.end()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

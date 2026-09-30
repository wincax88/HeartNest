import { withTransaction } from './client.mjs'

function domainError(code, message) {
  return Object.assign(new Error(message), { code })
}

function mapUser(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    timeZone: row.time_zone,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function mapMessage(row) {
  return {
    id: row.id,
    threadId: row.thread_id,
    clientMessageId: row.client_message_id,
    sender: row.sender,
    content: row.content,
    status: row.status,
    riskLevel: row.risk_level,
    createdAt: row.created_at.toISOString(),
  }
}

export function createRepositories(pool) {
  return {
    async createUser({ displayName = '新朋友', avatarUrl = null, timeZone = 'Asia/Shanghai' } = {}) {
      const result = await pool.query(
        `INSERT INTO users (display_name, avatar_url, time_zone)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [displayName, avatarUrl, timeZone],
      )
      return mapUser(result.rows[0])
    },

    async findOrCreateIdentityUser({ provider, subjectHash, unionIdHash = null }) {
      return withTransaction(pool, async (client) => {
        const existing = await client.query(
          `SELECT u.* FROM user_identities i
           JOIN users u ON u.id = i.user_id
           WHERE i.provider = $1 AND i.subject_hash = $2`,
          [provider, subjectHash],
        )
        if (existing.rowCount) return mapUser(existing.rows[0])

        let user
        if (unionIdHash) {
          const linked = await client.query(
            `SELECT u.* FROM user_identities i
             JOIN users u ON u.id = i.user_id
             WHERE i.union_id_hash = $1
             ORDER BY i.created_at
             LIMIT 1`,
            [unionIdHash],
          )
          user = linked.rows[0]
        }
        if (!user) {
          const created = await client.query('INSERT INTO users DEFAULT VALUES RETURNING *')
          user = created.rows[0]
          await client.query('INSERT INTO user_preferences (user_id) VALUES ($1)', [user.id])
          await client.query('INSERT INTO memberships (user_id) VALUES ($1)', [user.id])
        }
        await client.query(
          `INSERT INTO user_identities (user_id, provider, subject_hash, union_id_hash)
           VALUES ($1, $2, $3, $4)`,
          [user.id, provider, subjectHash, unionIdHash],
        )
        return mapUser(user)
      })
    },

    async createSession({ userId, refreshHash, expiresAt, deviceSummary = null }) {
      const result = await pool.query(
        `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, device_summary)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id`,
        [userId, refreshHash, expiresAt, deviceSummary],
      )
      return { id: result.rows[0].id, userId: result.rows[0].user_id }
    },

    async rotateSession({ previousHash, nextHash, expiresAt, deviceSummary = null }) {
      return withTransaction(pool, async (client) => {
        const previous = await client.query(
          `SELECT * FROM sessions WHERE refresh_token_hash = $1 FOR UPDATE`,
          [previousHash],
        )
        if (!previous.rowCount) throw Object.assign(new Error('刷新凭据无效'), { status: 401, code: 'INVALID_REFRESH_TOKEN' })
        const session = previous.rows[0]
        if (session.replaced_by) throw Object.assign(new Error('刷新凭据已被使用'), { status: 401, code: 'REFRESH_TOKEN_REUSED' })
        if (session.revoked_at) throw Object.assign(new Error('刷新凭据已撤销'), { status: 401, code: 'INVALID_REFRESH_TOKEN' })
        if (session.expires_at.getTime() <= Date.now()) throw Object.assign(new Error('刷新凭据已过期'), { status: 401, code: 'REFRESH_TOKEN_EXPIRED' })

        const created = await client.query(
          `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, device_summary)
           VALUES ($1, $2, $3, $4)
           RETURNING id, user_id`,
          [session.user_id, nextHash, expiresAt, deviceSummary ?? session.device_summary],
        )
        await client.query(
          `UPDATE sessions SET revoked_at = now(), replaced_by = $2, updated_at = now() WHERE id = $1`,
          [session.id, created.rows[0].id],
        )
        return { id: created.rows[0].id, userId: created.rows[0].user_id }
      })
    },

    async revokeSession(refreshHash) {
      await pool.query(
        `UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()), updated_at = now()
         WHERE refresh_token_hash = $1`,
        [refreshHash],
      )
    },

    async revokeAllSessions(userId) {
      await pool.query(
        `UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()), updated_at = now()
         WHERE user_id = $1`,
        [userId],
      )
    },

    async recordConsent(userId, { privacyVersion, termsVersion, aiVersion }) {
      const result = await pool.query(
        `INSERT INTO consents (user_id, privacy_version, terms_version, ai_version)
         VALUES ($1, $2, $3, $4)
         RETURNING id, privacy_version, terms_version, ai_version, accepted_at`,
        [userId, privacyVersion, termsVersion, aiVersion],
      )
      const row = result.rows[0]
      return {
        id: row.id,
        privacyVersion: row.privacy_version,
        termsVersion: row.terms_version,
        aiVersion: row.ai_version,
        acceptedAt: row.accepted_at.toISOString(),
      }
    },

    async hasCurrentConsent(userId, { privacyVersion, termsVersion, aiVersion }) {
      const result = await pool.query(
        `SELECT 1 FROM consents
         WHERE user_id = $1 AND privacy_version = $2 AND terms_version = $3
           AND ai_version = $4 AND withdrawn_at IS NULL
         ORDER BY accepted_at DESC LIMIT 1`,
        [userId, privacyVersion, termsVersion, aiVersion],
      )
      return result.rowCount === 1
    },

    async createDataExport({ userId, downloadTokenHash, expiresAt }) {
      const [user, identities, consents, moods, threads, messages, memories] = await Promise.all([
        pool.query('SELECT id, display_name, avatar_url, time_zone, status, created_at, updated_at FROM users WHERE id = $1', [userId]),
        pool.query('SELECT provider, created_at FROM user_identities WHERE user_id = $1', [userId]),
        pool.query('SELECT privacy_version, terms_version, ai_version, accepted_at, withdrawn_at FROM consents WHERE user_id = $1', [userId]),
        pool.query('SELECT mood_id, summary, recorded_at FROM mood_records WHERE user_id = $1 ORDER BY recorded_at', [userId]),
        pool.query('SELECT id, companion_id, created_at FROM chat_threads WHERE user_id = $1 ORDER BY created_at', [userId]),
        pool.query(`SELECT m.thread_id, m.sender, m.content, m.status, m.risk_level, m.created_at
                    FROM chat_messages m JOIN chat_threads t ON t.id = m.thread_id
                    WHERE t.user_id = $1 ORDER BY m.created_at`, [userId]),
        pool.query('SELECT title, summary, retained, created_at FROM memories WHERE user_id = $1 ORDER BY created_at', [userId]),
      ])
      if (!user.rowCount) throw Object.assign(new Error('用户不存在'), { status: 404, code: 'USER_NOT_FOUND' })
      const payload = {
        exportedAt: new Date().toISOString(),
        profile: user.rows[0],
        identities: identities.rows,
        consents: consents.rows,
        moods: moods.rows,
        threads: threads.rows,
        messages: messages.rows,
        memories: memories.rows,
      }
      const result = await pool.query(
        `INSERT INTO data_exports (user_id, status, download_token_hash, expires_at, payload)
         VALUES ($1, 'ready', $2, $3, $4::jsonb)
         RETURNING id, status, expires_at`,
        [userId, downloadTokenHash, expiresAt, JSON.stringify(payload)],
      )
      return { id: result.rows[0].id, status: result.rows[0].status, expiresAt: result.rows[0].expires_at.toISOString() }
    },

    async consumeDataExport({ userId, exportId, downloadTokenHash }) {
      return withTransaction(pool, async (client) => {
        const result = await client.query(
          `SELECT * FROM data_exports WHERE id = $1 AND user_id = $2 FOR UPDATE`,
          [exportId, userId],
        )
        if (!result.rowCount || result.rows[0].download_token_hash !== downloadTokenHash) {
          throw Object.assign(new Error('导出文件不存在'), { status: 404, code: 'EXPORT_NOT_FOUND' })
        }
        const record = result.rows[0]
        if (record.downloaded_at) throw Object.assign(new Error('下载凭据已使用'), { status: 410, code: 'EXPORT_TOKEN_USED' })
        if (record.expires_at.getTime() <= Date.now()) throw Object.assign(new Error('下载凭据已过期'), { status: 410, code: 'EXPORT_EXPIRED' })
        await client.query('UPDATE data_exports SET downloaded_at = now(), updated_at = now() WHERE id = $1', [exportId])
        return record.payload
      })
    },

    async requestDeletion(userId, deleteAfter) {
      const result = await pool.query(
        `UPDATE users SET status = 'deletion_pending', delete_after = $2, updated_at = now()
         WHERE id = $1
         RETURNING status, delete_after`,
        [userId, deleteAfter],
      )
      if (!result.rowCount) throw Object.assign(new Error('用户不存在'), { status: 404, code: 'USER_NOT_FOUND' })
      await pool.query('UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()), updated_at = now() WHERE user_id = $1', [userId])
      return { status: result.rows[0].status, deleteAfter: result.rows[0].delete_after.toISOString() }
    },

    async cancelDeletion(userId) {
      const result = await pool.query(
        `UPDATE users SET status = 'active', delete_after = NULL, updated_at = now()
         WHERE id = $1 AND status = 'deletion_pending'
         RETURNING status`,
        [userId],
      )
      if (!result.rowCount) throw Object.assign(new Error('没有待取消的注销请求'), { status: 409, code: 'DELETION_NOT_PENDING' })
      return { status: result.rows[0].status }
    },

    async deleteDueUsers(now = new Date()) {
      return withTransaction(pool, async (client) => {
        const result = await client.query(
          `WITH due AS MATERIALIZED (
             SELECT id FROM users
             WHERE status = 'deletion_pending' AND delete_after <= $1
             FOR UPDATE
           ), tombstones AS (
             INSERT INTO deletion_tombstones (user_hash, deleted_at)
             SELECT encode(digest(id::text, 'sha256'), 'hex'), $1 FROM due
             ON CONFLICT (user_hash) DO NOTHING
           ), deleted AS (
             DELETE FROM users WHERE id IN (SELECT id FROM due) RETURNING id
           )
           SELECT count(*)::int AS count FROM deleted`,
          [now],
        )
        return { deleted: result.rows[0].count }
      })
    },

    async insertMessage(userId, companionId, { clientMessageId, content }) {
      if (!clientMessageId || !content) throw domainError('INVALID_MESSAGE', '消息标识和内容不能为空')
      return withTransaction(pool, async (client) => {
        const user = await client.query('SELECT 1 FROM users WHERE id = $1 AND status = $2', [userId, 'active'])
        if (!user.rowCount) throw domainError('USER_NOT_FOUND', '用户不存在')

        const threadResult = await client.query(
          `INSERT INTO chat_threads (user_id, companion_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, companion_id)
           DO UPDATE SET updated_at = now()
           RETURNING id`,
          [userId, companionId],
        )
        const threadId = threadResult.rows[0].id
        const existing = await client.query(
          `SELECT * FROM chat_messages
           WHERE thread_id = $1 AND client_message_id = $2`,
          [threadId, clientMessageId],
        )
        if (existing.rowCount) {
          if (existing.rows[0].content !== content) {
            throw domainError('MESSAGE_ID_CONFLICT', '消息标识已用于不同内容')
          }
          return mapMessage(existing.rows[0])
        }

        const inserted = await client.query(
          `INSERT INTO chat_messages
             (thread_id, client_message_id, sender, content, status)
           VALUES ($1, $2, 'user', $3, 'sending')
           RETURNING *`,
          [threadId, clientMessageId, content],
        )
        return mapMessage(inserted.rows[0])
      })
    },
  }
}

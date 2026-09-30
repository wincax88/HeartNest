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

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

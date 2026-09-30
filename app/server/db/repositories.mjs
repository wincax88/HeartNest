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

    async entitlementContext(userId, now = new Date()) {
      const result = await pool.query(
        `SELECT u.time_zone,
                CASE WHEN m.tier = 'pro' AND (m.ends_at IS NULL OR m.ends_at > $2) THEN 'pro' ELSE 'free' END AS plan
         FROM users u
         LEFT JOIN memberships m ON m.user_id = u.id
         WHERE u.id = $1 AND u.status = 'active'`,
        [userId, now],
      )
      if (!result.rowCount) throw Object.assign(new Error('用户不存在'), { status: 404, code: 'USER_NOT_FOUND' })
      return { plan: result.rows[0].plan, timeZone: result.rows[0].time_zone }
    },

    async planCapabilities(plan) {
      const result = await pool.query(
        `SELECT capability, enabled, limit_value, period_kind
         FROM plan_catalog WHERE plan_id = $1 ORDER BY capability`,
        [plan],
      )
      return result.rows.map((row) => ({
        capability: row.capability,
        enabled: row.enabled,
        limitValue: row.limit_value,
        periodKind: row.period_kind,
      }))
    },

    async usageForPeriod(userId, periodStart) {
      const result = await pool.query(
        `SELECT capability, used FROM usage_counters
         WHERE user_id = $1 AND (period_start = $2 OR period_start = DATE '1970-01-01')`,
        [userId, periodStart],
      )
      return Object.fromEntries(result.rows.map((row) => [row.capability, row.used]))
    },

    async consumeUsageQuota({ userId, capability, referenceId, periodStart, limit }) {
      return withTransaction(pool, async (client) => {
        const event = await client.query(
          `INSERT INTO usage_events (user_id, capability, reference_id, period_start)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, capability, reference_id) DO NOTHING
           RETURNING reference_id`,
          [userId, capability, referenceId, periodStart],
        )
        if (!event.rowCount) {
          const current = await client.query(
            `SELECT used FROM usage_counters
             WHERE user_id = $1 AND capability = $2 AND period_start = $3`,
            [userId, capability, periodStart],
          )
          return current.rowCount ? { used: current.rows[0].used, replay: true } : null
        }

        const counter = await client.query(
          `INSERT INTO usage_counters (user_id, capability, period_start, used)
           VALUES ($1, $2, $3, 1)
           ON CONFLICT (user_id, capability, period_start)
           DO UPDATE SET used = usage_counters.used + 1, updated_at = now()
           WHERE $4::integer IS NULL OR usage_counters.used < $4
           RETURNING used`,
          [userId, capability, periodStart, limit],
        )
        if (!counter.rowCount) throw Object.assign(new Error('QUOTA_EXHAUSTED'), { code: 'QUOTA_EXHAUSTED' })
        return { used: counter.rows[0].used, replay: false }
      }).catch((error) => {
        if (error.code === 'QUOTA_EXHAUSTED') return null
        throw error
      })
    },

    async getPaymentProduct(productId) {
      const result = await pool.query('SELECT * FROM payment_products WHERE id = $1', [productId])
      if (!result.rowCount) return null
      const row = result.rows[0]
      return { id: row.id, title: row.title, amount: row.amount, currency: row.currency, durationDays: row.duration_days, enabled: row.enabled }
    },

    async createPaymentOrder({ userId, product, merchantOrderNo }) {
      const result = await pool.query(
        `INSERT INTO payment_orders (user_id, product_id, merchant_order_no, amount, currency)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, product.id, merchantOrderNo, product.amount, product.currency],
      )
      const row = result.rows[0]
      return { id: row.id, userId: row.user_id, productId: row.product_id, merchantOrderNo: row.merchant_order_no, amount: row.amount, currency: row.currency, status: row.status }
    },

    async markPaymentOrderPending(orderId, platformPayload) {
      const result = await pool.query(
        `UPDATE payment_orders SET status = 'pending', platform_payload = $2::jsonb, updated_at = now()
         WHERE id = $1 AND status = 'created' RETURNING *`,
        [orderId, JSON.stringify(platformPayload)],
      )
      if (!result.rowCount) throw Object.assign(new Error('支付订单状态无效'), { status: 409, code: 'PAYMENT_ORDER_STATE' })
      const row = result.rows[0]
      return { id: row.id, merchantOrderNo: row.merchant_order_no, status: row.status, amount: row.amount, currency: row.currency, platform: row.platform_payload }
    },

    async paymentOrderForUser(userId, orderId) {
      const result = await pool.query('SELECT * FROM payment_orders WHERE id = $1 AND user_id = $2', [orderId, userId])
      if (!result.rowCount) return null
      const row = result.rows[0]
      return { id: row.id, merchantOrderNo: row.merchant_order_no, status: row.status, amount: row.amount, currency: row.currency, platform: row.platform_payload, paidAt: row.paid_at?.toISOString() || null }
    },

    async completePaymentOrder({ merchantOrderNo, platformTransactionId, amount, currency }) {
      return withTransaction(pool, async (client) => {
        const result = await client.query(
          `SELECT o.*, p.duration_days FROM payment_orders o
           JOIN payment_products p ON p.id = o.product_id
           WHERE o.merchant_order_no = $1 FOR UPDATE`,
          [merchantOrderNo],
        )
        if (!result.rowCount) throw Object.assign(new Error('支付订单不存在'), { status: 404, code: 'PAYMENT_ORDER_NOT_FOUND' })
        const order = result.rows[0]
        if (order.amount !== amount || order.currency !== currency) {
          throw Object.assign(new Error('支付金额不匹配'), { status: 400, code: 'PAYMENT_AMOUNT_MISMATCH' })
        }
        if (order.status === 'paid') return { id: order.id, status: order.status, membershipTier: 'pro' }
        if (!['created', 'pending'].includes(order.status)) throw Object.assign(new Error('支付订单状态无效'), { status: 409, code: 'PAYMENT_ORDER_STATE' })

        await client.query(
          `UPDATE payment_orders
           SET status = 'paid', platform_transaction_id = $2, paid_at = now(), updated_at = now()
           WHERE id = $1`,
          [order.id, platformTransactionId],
        )
        const currentMembership = await client.query('SELECT ends_at FROM memberships WHERE user_id = $1 FOR UPDATE', [order.user_id])
        const currentEnd = currentMembership.rows[0]?.ends_at
        const startsAt = currentEnd && currentEnd > new Date() ? currentEnd : new Date()
        const endsAt = new Date(startsAt.getTime() + order.duration_days * 86_400_000)
        await client.query(
          `INSERT INTO membership_grants (user_id, payment_order_id, tier, starts_at, ends_at)
           VALUES ($1, $2, 'pro', $3, $4)`,
          [order.user_id, order.id, startsAt, endsAt],
        )
        await client.query(
          `INSERT INTO memberships (user_id, tier, title, benefits, source, starts_at, ends_at)
           VALUES ($1, 'pro', '心栖会员', '["无限对话","长期记忆","高级回顾"]'::jsonb, 'wechat_pay', $2, $3)
           ON CONFLICT (user_id) DO UPDATE SET
             tier = 'pro', title = EXCLUDED.title, benefits = EXCLUDED.benefits,
             source = EXCLUDED.source, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at,
             updated_at = now()`,
          [order.user_id, startsAt, endsAt],
        )
        return { id: order.id, status: 'paid', membershipTier: 'pro' }
      })
    },

    async upsertNotificationDevice(userId, { platform, token, status = 'active' }) {
      const result = await pool.query(
        `INSERT INTO notification_devices (user_id, platform, token, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, platform, token) DO UPDATE SET status = EXCLUDED.status, updated_at = now()
         RETURNING id, platform, status`,
        [userId, platform, token, status],
      )
      return result.rows[0]
    },

    async upsertNotificationAuthorization(userId, { channel, templateId, subject = null, status = 'authorized' }) {
      const result = await pool.query(
        `INSERT INTO notification_authorizations (user_id, channel, template_id, subject, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, channel, template_id) DO UPDATE SET subject = EXCLUDED.subject, status = EXCLUDED.status, updated_at = now()
         RETURNING channel, template_id, status`,
        [userId, channel, templateId, subject, status],
      )
      return { channel: result.rows[0].channel, templateId: result.rows[0].template_id, status: result.rows[0].status }
    },

    async notificationTargetAuthorized(userId, channel, target) {
      if (channel === 'wechat') {
        const result = await pool.query(
          `SELECT 1 FROM notification_authorizations
           WHERE user_id = $1 AND channel = 'wechat' AND template_id = $2 AND status = 'authorized'`,
          [userId, target.templateId],
        )
        return result.rowCount === 1
      }
      if (channel === 'app') {
        const result = await pool.query(
          `SELECT 1 FROM notification_devices
           WHERE user_id = $1 AND platform = 'app' AND token = $2 AND status = 'active'`,
          [userId, target.token],
        )
        return result.rowCount === 1
      }
      return false
    },

    async listReminderSchedules(userId) {
      const result = await pool.query('SELECT * FROM reminder_schedules WHERE user_id = $1 ORDER BY created_at', [userId])
      return result.rows.map((row) => ({
        id: row.id, channel: row.channel, time: row.reminder_time.slice(0, 5), timeZone: row.time_zone,
        quietStart: row.quiet_start.slice(0, 5), quietEnd: row.quiet_end.slice(0, 5), enabled: row.enabled,
        payload: row.payload, target: row.target, nextDeliveryAt: row.next_delivery_at.toISOString(),
      }))
    },

    async createReminderSchedule(userId, input) {
      const result = await pool.query(
        `INSERT INTO reminder_schedules
           (user_id, channel, reminder_time, time_zone, quiet_start, quiet_end, payload, target, enabled, next_delivery_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
         RETURNING id`,
        [userId, input.channel, input.time, input.timeZone, input.quietStart, input.quietEnd, JSON.stringify(input.payload || {}), JSON.stringify(input.target || {}), input.enabled !== false, input.nextDeliveryAt],
      )
      return (await this.listReminderSchedules(userId)).find((item) => item.id === result.rows[0].id)
    },

    async updateReminderSchedule(userId, scheduleId, input) {
      const result = await pool.query(
        `UPDATE reminder_schedules SET
           channel = $3, reminder_time = $4, time_zone = $5, quiet_start = $6, quiet_end = $7,
           payload = $8::jsonb, target = $9::jsonb, enabled = $10, next_delivery_at = $11, updated_at = now()
         WHERE id = $1 AND user_id = $2 RETURNING id`,
        [scheduleId, userId, input.channel, input.time, input.timeZone, input.quietStart, input.quietEnd, JSON.stringify(input.payload || {}), JSON.stringify(input.target || {}), input.enabled !== false, input.nextDeliveryAt],
      )
      if (!result.rowCount) throw Object.assign(new Error('提醒计划不存在'), { status: 404, code: 'REMINDER_NOT_FOUND' })
      return (await this.listReminderSchedules(userId)).find((item) => item.id === scheduleId)
    },

    async deleteReminderSchedule(userId, scheduleId) {
      const result = await pool.query('DELETE FROM reminder_schedules WHERE id = $1 AND user_id = $2', [scheduleId, userId])
      if (!result.rowCount) throw Object.assign(new Error('提醒计划不存在'), { status: 404, code: 'REMINDER_NOT_FOUND' })
    },

    async enqueueDueReminderJobs(now = new Date()) {
      return withTransaction(pool, async (client) => {
        const due = await client.query(
          `SELECT * FROM reminder_schedules
           WHERE enabled = true AND next_delivery_at <= $1
           ORDER BY next_delivery_at FOR UPDATE SKIP LOCKED LIMIT 100`,
          [now],
        )
        for (const row of due.rows) {
          await client.query(
            `INSERT INTO notification_jobs
               (schedule_id, user_id, channel, payload, target, scheduled_for, next_attempt_at)
             VALUES ($1, $2, $3, $4, $5, $6, $6)
             ON CONFLICT (schedule_id, scheduled_for) DO NOTHING`,
            [row.id, row.user_id, row.channel, row.payload, row.target, row.next_delivery_at],
          )
          await client.query('UPDATE reminder_schedules SET next_delivery_at = next_delivery_at + interval \'1 day\', updated_at = now() WHERE id = $1', [row.id])
        }
        return due.rowCount
      })
    },

    async claimNotificationJobs(limit = 20, now = new Date()) {
      return withTransaction(pool, async (client) => {
        const result = await client.query(
          `WITH due AS (
             SELECT id FROM notification_jobs
             WHERE status = 'pending' AND next_attempt_at <= $1
             ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT $2
           )
           UPDATE notification_jobs j
           SET status = 'processing', attempts = attempts + 1, updated_at = now()
           FROM due WHERE j.id = due.id
           RETURNING j.*`,
          [now, limit],
        )
        return result.rows.map((row) => ({ id: row.id, channel: row.channel, attempts: row.attempts, payload: row.payload, target: row.target }))
      })
    },

    async markNotificationDelivered(jobId) {
      await pool.query("UPDATE notification_jobs SET status = 'delivered', delivered_at = now(), updated_at = now() WHERE id = $1", [jobId])
    },

    async retryNotificationJob(jobId, nextAttemptAt, errorMessage) {
      await pool.query(
        "UPDATE notification_jobs SET status = 'pending', next_attempt_at = $2, last_error = $3, updated_at = now() WHERE id = $1",
        [jobId, nextAttemptAt, errorMessage.slice(0, 500)],
      )
    },

    async deadLetterNotificationJob(jobId, errorMessage) {
      await withTransaction(pool, async (client) => {
        await client.query("UPDATE notification_jobs SET status = 'dead', last_error = $2, updated_at = now() WHERE id = $1", [jobId, errorMessage.slice(0, 500)])
        await client.query(
          `INSERT INTO notification_dead_letters (job_id, error_message) VALUES ($1, $2)
           ON CONFLICT (job_id) DO UPDATE SET error_message = EXCLUDED.error_message, failed_at = now()`,
          [jobId, errorMessage.slice(0, 500)],
        )
      })
    },

    async updateUserProfile(userId, { displayName, avatarUrl }) {
      const result = await pool.query(
        `UPDATE users SET display_name = $2, avatar_url = $3, updated_at = now()
         WHERE id = $1 AND status = 'active' RETURNING *`,
        [userId, displayName, avatarUrl],
      )
      if (!result.rowCount) throw Object.assign(new Error('用户不存在'), { status: 404, code: 'USER_NOT_FOUND' })
      return mapUser(result.rows[0])
    },

    async favoriteMessage(userId, messageId) {
      const result = await pool.query(
        `INSERT INTO favorites (user_id, target_type, target_id)
         SELECT $1, 'message', m.id FROM chat_messages m
         JOIN chat_threads t ON t.id = m.thread_id
         WHERE m.id = $2 AND t.user_id = $1
         ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET target_id = EXCLUDED.target_id
         RETURNING id, target_id, created_at`,
        [userId, messageId],
      )
      if (!result.rowCount) throw Object.assign(new Error('消息不存在'), { status: 404, code: 'MESSAGE_NOT_FOUND' })
      const row = result.rows[0]
      return { id: row.id, targetType: 'message', targetId: row.target_id, createdAt: row.created_at.toISOString() }
    },

    async listFavorites(userId) {
      const result = await pool.query(
        `SELECT f.id, f.target_id, f.created_at, m.content, m.sender, m.created_at AS message_created_at, t.companion_id
         FROM favorites f
         JOIN chat_messages m ON m.id = f.target_id
         JOIN chat_threads t ON t.id = m.thread_id AND t.user_id = f.user_id
         WHERE f.user_id = $1 AND f.target_type = 'message'
         ORDER BY f.created_at DESC`,
        [userId],
      )
      return result.rows.map((row) => ({
        id: row.id, targetType: 'message', targetId: row.target_id, content: row.content,
        sender: row.sender, companionId: row.companion_id, messageCreatedAt: row.message_created_at.toISOString(), createdAt: row.created_at.toISOString(),
      }))
    },

    async deleteFavorite(userId, favoriteId) {
      const result = await pool.query('DELETE FROM favorites WHERE id = $1 AND user_id = $2', [favoriteId, userId])
      if (!result.rowCount) throw Object.assign(new Error('收藏不存在'), { status: 404, code: 'FAVORITE_NOT_FOUND' })
    },

    async reviewMoodRecords(userId, { from, to, mood }) {
      const result = await pool.query(
        `SELECT id, mood_id, summary, recorded_at
         FROM mood_records
         WHERE user_id = $1 AND recorded_at >= $2::date AND recorded_at < ($3::date + interval '1 day')
           AND ($4::text IS NULL OR mood_id = $4)
         ORDER BY recorded_at`,
        [userId, from, to, mood],
      )
      return result.rows.map((row) => ({ id: row.id, moodId: row.mood_id, summary: row.summary, recordedAt: row.recorded_at.toISOString() }))
    },
  }
}

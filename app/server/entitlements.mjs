const quotaCodes = {
  daily_chat: 'DAILY_CHAT_QUOTA',
  saved_memories: 'MEMORY_QUOTA',
}

function quotaError(capability, resetAt) {
  return Object.assign(new Error('当前权益额度已用完'), {
    status: 429,
    code: quotaCodes[capability] || 'CAPABILITY_QUOTA',
    resetAt,
  })
}

function dailyPeriod(now) {
  const periodStart = now.toISOString().slice(0, 10)
  const resetAt = new Date(`${periodStart}T00:00:00.000Z`)
  resetAt.setUTCDate(resetAt.getUTCDate() + 1)
  return { periodStart, resetAt: resetAt.toISOString() }
}

export function entitlementsFor({ plan, capabilities, usage = {} }, now = new Date()) {
  const daily = dailyPeriod(now)
  return {
    plan,
    capabilities: Object.fromEntries(capabilities.map((item) => {
      const used = usage[item.capability] || 0
      return [item.capability, {
        enabled: item.enabled,
        limit: item.limitValue,
        used,
        remaining: item.limitValue === null ? null : Math.max(0, item.limitValue - used),
        resetAt: item.periodKind === 'day' ? daily.resetAt : null,
      }]
    })),
  }
}

export function createEntitlementService({ repositories, clock = () => new Date() }) {
  return {
    async forUser(userId) {
      const now = clock()
      const context = await repositories.entitlementContext(userId, now)
      const capabilities = await repositories.planCapabilities(context.plan)
      const { periodStart } = dailyPeriod(now)
      const usage = await repositories.usageForPeriod(userId, periodStart)
      return entitlementsFor({ ...context, capabilities, usage }, now)
    },

    async consume(userId, capability, { referenceId, now = clock() } = {}) {
      if (!referenceId) throw Object.assign(new Error('配额引用标识不能为空'), { status: 400, code: 'INVALID_QUOTA_REFERENCE' })
      const context = await repositories.entitlementContext(userId, now)
      const capabilities = await repositories.planCapabilities(context.plan)
      const entitlement = capabilities.find((item) => item.capability === capability)
      if (!entitlement?.enabled) throw Object.assign(new Error('当前方案不包含此能力'), { status: 403, code: 'CAPABILITY_NOT_INCLUDED' })
      const period = entitlement.periodKind === 'day' ? dailyPeriod(now) : { periodStart: '1970-01-01', resetAt: null }
      const result = await repositories.consumeUsageQuota({
        userId,
        capability,
        referenceId,
        periodStart: period.periodStart,
        limit: entitlement.limitValue,
      })
      if (!result) throw quotaError(capability, period.resetAt)
      return {
        limit: entitlement.limitValue,
        used: result.used,
        remaining: entitlement.limitValue === null ? null : Math.max(0, entitlement.limitValue - result.used),
        resetAt: period.resetAt,
      }
    },
  }
}

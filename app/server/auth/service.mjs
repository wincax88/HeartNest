import { createHmac } from 'node:crypto'

function authError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

function identityHash(key, value) {
  return value ? createHmac('sha256', key).update(value).digest('hex') : null
}

export function createAuthService({ repositories, tokenService, providers, identityHashKey }) {
  if (!identityHashKey) throw new Error('identityHashKey is required')

  async function issueSession(userId, deviceSummary = null) {
    const refreshToken = tokenService.createRefreshToken()
    const refreshHash = tokenService.hashRefreshToken(refreshToken)
    const expiresAt = new Date(Date.now() + 30 * 86_400_000)
    await repositories.createSession({ userId, refreshHash, expiresAt, deviceSummary })
    return {
      accessToken: await tokenService.issueAccessToken(userId),
      refreshToken,
      expiresIn: 900,
    }
  }

  return {
    async resolveProviderSubject(userId, provider, code) {
      if (typeof code !== 'string' || !code.trim()) throw authError(400, 'INVALID_PROVIDER_CODE', '请重新授权微信提醒')
      const adapter = providers[provider]
      if (!adapter) throw authError(400, 'INVALID_PROVIDER', '不支持的授权方式')
      let identity
      try { identity = await adapter.exchange(code) }
      catch (error) {
        // A stale WeChat code is not an expired HeartNest session.
        if (error.status === 401) throw authError(400, 'NOTIFICATION_PROVIDER_AUTH_FAILED', '微信授权未完成，请重新尝试')
        throw error
      }
      if (!identity?.subject || identity.provider !== provider) throw authError(502, 'INVALID_PROVIDER_RESPONSE', '微信授权返回了无效身份')
      const matches = await repositories.identityBelongsToUser(userId, provider, identityHash(identityHashKey, `${provider}:${identity.subject}`))
      if (!matches) throw authError(403, 'NOTIFICATION_IDENTITY_MISMATCH', '微信身份与当前账号不一致，请重新登录')
      return identity.subject
    },

    async login({ provider, code, deviceSummary = null }) {
      const adapter = providers[provider]
      if (!adapter) throw authError(400, 'INVALID_PROVIDER', '不支持的登录方式')
      const identity = await adapter.exchange(code)
      if (!identity?.subject) throw authError(502, 'INVALID_PROVIDER_RESPONSE', '登录服务返回了无效身份')
      const user = await repositories.findOrCreateIdentityUser({
        provider: identity.provider,
        subjectHash: identityHash(identityHashKey, `${identity.provider}:${identity.subject}`),
        unionIdHash: identity.unionId ? identityHash(identityHashKey, identity.unionId) : null,
      })
      return { userId: user.id, ...(await issueSession(user.id, deviceSummary)) }
    },

    async refresh(refreshToken, deviceSummary = null) {
      const previousHash = tokenService.hashRefreshToken(refreshToken)
      const nextToken = tokenService.createRefreshToken()
      const nextHash = tokenService.hashRefreshToken(nextToken)
      const session = await repositories.rotateSession({
        previousHash,
        nextHash,
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        deviceSummary,
      })
      return {
        userId: session.userId,
        accessToken: await tokenService.issueAccessToken(session.userId),
        refreshToken: nextToken,
        expiresIn: 900,
      }
    },

    async authenticate(accessToken) {
      if (!accessToken) throw authError(401, 'AUTH_REQUIRED', '请先登录')
      return tokenService.verifyAccessToken(accessToken)
    },

    async logout(refreshToken) {
      await repositories.revokeSession(tokenService.hashRefreshToken(refreshToken))
    },

    async logoutAll(userId) {
      await repositories.revokeAllSessions(userId)
    },
  }
}

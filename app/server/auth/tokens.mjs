import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'

function secretBytes(value) {
  if (typeof value !== 'string' || value.length < 32) throw new Error('TOKEN_SIGNING_KEY must be at least 32 characters')
  return new TextEncoder().encode(value)
}

export function createTokenService({ signingKey, issuer = 'heartnest', audience = 'heartnest-client' }) {
  const secret = secretBytes(signingKey)

  return {
    async issueAccessToken(userId) {
      return new SignJWT({ scope: 'user' })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(userId)
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(secret)
    },

    async verifyAccessToken(token) {
      try {
        const { payload } = await jwtVerify(token, secret, { issuer, audience })
        if (!payload.sub) throw new Error('missing subject')
        return { userId: payload.sub }
      } catch {
        throw Object.assign(new Error('登录状态已失效'), { status: 401, code: 'INVALID_ACCESS_TOKEN' })
      }
    },

    createRefreshToken() {
      return randomBytes(32).toString('base64url')
    },

    hashRefreshToken(token) {
      if (typeof token !== 'string' || token.length < 32) {
        throw Object.assign(new Error('刷新凭据无效'), { status: 401, code: 'INVALID_REFRESH_TOKEN' })
      }
      return createHash('sha256').update(token).digest('hex')
    },
  }
}

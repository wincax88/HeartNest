export function createAuthMiddleware(authService) {
  return async function authenticate(req, _res, next) {
    try {
      const authorization = req.get('authorization') || ''
      const match = authorization.match(/^Bearer\s+(.+)$/i)
      const identity = await authService.authenticate(match?.[1])
      req.userId = identity.userId
      req.deviceId = identity.userId
      next()
    } catch (error) {
      next(error)
    }
  }
}

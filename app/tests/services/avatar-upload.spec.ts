import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/services/api')
const path = '/api/avatars/12345678-1234-1234-1234-123456789abc'

describe('authenticated avatar API', () => {
  const uploadFile = vi.fn()
  const request = vi.fn()
  const storage = new Map<string, string>()

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.heartnest.test/api')
    storage.clear()
    uploadFile.mockReset()
    request.mockReset()
    vi.stubGlobal('uni', {
      uploadFile, request,
      getStorageSync: (key: string) => storage.get(key),
      setStorageSync: (key: string, value: string) => storage.set(key, value),
      removeStorageSync: (key: string) => storage.delete(key),
    })
  })
  afterEach(() => vi.unstubAllEnvs())

  it('uploads as multipart with the session header and returns a durable path', async () => {
    const { api, setSession } = await import('@/services/api')
    setSession({ userId: 'user', accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 })
    uploadFile.mockImplementation(options => options.success({ statusCode: 201, data: JSON.stringify({ avatarUrl: path }) }))
    expect(await api.uploadAvatar('wxfile://image')).toEqual({ avatarUrl: path })
    expect(uploadFile.mock.calls[0][0]).toMatchObject({ url: 'https://api.heartnest.test/api/profile/avatar', filePath: 'wxfile://image', name: 'avatar', header: { Authorization: 'Bearer access' } })
    expect(uploadFile.mock.calls[0][0].header['Content-Type']).toBeUndefined()
  })

  it('refreshes an expired access token once and retries the same file', async () => {
    const { api, setSession } = await import('@/services/api')
    setSession({ userId: 'user', accessToken: 'expired', refreshToken: 'refresh', expiresIn: 900 })
    uploadFile.mockImplementationOnce(options => options.success({ statusCode: 401, data: JSON.stringify({ error: { code: 'EXPIRED' } }) }))
      .mockImplementationOnce(options => options.success({ statusCode: 201, data: JSON.stringify({ avatarUrl: path }) }))
    request.mockImplementation(options => options.success({ statusCode: 200, data: { userId: 'user', accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 900 } }))
    await api.uploadAvatar('wxfile://image')
    expect(request).toHaveBeenCalledOnce()
    expect(uploadFile).toHaveBeenCalledTimes(2)
    expect(uploadFile.mock.calls[1][0].header.Authorization).toBe('Bearer new-access')
    expect(storage.get('heartnest-refresh-token')).toBe('new-refresh')
  })

  it('reports upload rejection and network failures without logging the user out', async () => {
    const { api, setSession } = await import('@/services/api')
    setSession({ userId: 'user', accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 })
    uploadFile.mockImplementationOnce(options => options.success({ statusCode: 413, data: JSON.stringify({ error: { code: 'AVATAR_TOO_LARGE', message: '图片太大' } }) }))
    await expect(api.uploadAvatar('wxfile://large')).rejects.toMatchObject({ status: 413, message: '图片太大' })
    uploadFile.mockImplementationOnce(options => options.fail({ errMsg: '连接已断开' }))
    await expect(api.uploadAvatar('wxfile://image')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
    expect(storage.get('heartnest-refresh-token')).toBe('refresh')
  })

  it('clears an invalid session after a failed refresh and never loops upload retries', async () => {
    const { api, setSession } = await import('@/services/api')
    setSession({ userId: 'user', accessToken: 'expired', refreshToken: 'invalid', expiresIn: 900 })
    uploadFile.mockImplementation(options => options.success({ statusCode: 401, data: JSON.stringify({ error: { code: 'EXPIRED' } }) }))
    request.mockImplementation(options => options.success({ statusCode: 401, data: { error: { code: 'INVALID_REFRESH_TOKEN', message: '请重新登录' } } }))
    await expect(api.uploadAvatar('wxfile://image')).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' })
    expect(uploadFile).toHaveBeenCalledOnce()
    expect(storage.get('heartnest-refresh-token')).toBeUndefined()
  })

  it.each([
    ['uploadFile:fail createUploadTask:fail url not in domain list', 'UPLOAD_DOMAIN_NOT_ALLOWED', '头像上传服务暂不可用，请稍后再试'],
    ['uploadFile:fail timeout', 'UPLOAD_TIMEOUT', '头像上传超时，请重试'],
    ['uploadFile:fail network disconnected', 'NETWORK_ERROR', '头像上传失败，请检查网络后重试'],
  ])('translates native upload failures without retrying or clearing the session: %s', async (errMsg, code, message) => {
    const { api, setSession } = await import('@/services/api')
    setSession({ userId: 'user', accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 })
    uploadFile.mockImplementation(options => options.fail({ errMsg }))

    await expect(api.uploadAvatar('wxfile://image')).rejects.toMatchObject({ status: 0, code, message })
    expect(uploadFile).toHaveBeenCalledOnce()
    expect(request).not.toHaveBeenCalled()
    expect(storage.get('heartnest-refresh-token')).toBe('refresh')
  })

  it('rejects malformed or temporary avatar addresses', async () => {
    const { api } = await import('@/services/api')
    uploadFile.mockImplementationOnce(options => options.success({ statusCode: 201, data: '<html>error</html>' }))
    await expect(api.uploadAvatar('wxfile://image')).rejects.toMatchObject({ code: 'INVALID_UPLOAD_RESPONSE' })
    uploadFile.mockImplementationOnce(options => options.success({ statusCode: 201, data: 'null' }))
    await expect(api.uploadAvatar('wxfile://image')).rejects.toMatchObject({ code: 'INVALID_UPLOAD_RESPONSE' })
    uploadFile.mockImplementationOnce(options => options.success({ statusCode: 201, data: JSON.stringify({ avatarUrl: 'wxfile://temporary' }) }))
    await expect(api.uploadAvatar('wxfile://image')).rejects.toMatchObject({ code: 'INVALID_UPLOAD_RESPONSE' })
  })

  it('explains an unavailable server route without retrying or clearing the session', async () => {
    const { api, setSession } = await import('@/services/api')
    setSession({ userId: 'user', accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 })
    uploadFile.mockImplementation(options => options.success({ statusCode: 404, data: JSON.stringify({ error: { code: 'API_NOT_FOUND', message: '接口不存在' } }) }))

    await expect(api.uploadAvatar('wxfile://image')).rejects.toMatchObject({ status: 404, code: 'AVATAR_UPLOAD_UNAVAILABLE', message: '头像上传服务尚未就绪，请稍后再试' })
    expect(uploadFile).toHaveBeenCalledOnce()
    expect(request).not.toHaveBeenCalled()
    expect(storage.get('heartnest-refresh-token')).toBe('refresh')
  })

  it('resolves managed avatar paths against the API host for saved profiles and bootstrap', async () => {
    const { api } = await import('@/services/api')
    request.mockImplementationOnce(options => options.success({ statusCode: 200, data: { displayName: '微信朋友', avatar: path } }))
      .mockImplementationOnce(options => options.success({ statusCode: 200, data: { profile: { displayName: '微信朋友', avatar: path, streakDays: 3 } } }))
    expect((await api.updateProfile({ displayName: '微信朋友', avatarUrl: path })).avatar).toBe(`https://api.heartnest.test${path}`)
    expect((await api.bootstrap()).profile.avatar).toBe(`https://api.heartnest.test${path}`)
  })
})

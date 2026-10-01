// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createApi } from '../../server/app.mjs'
import { createAvatarService, MAX_AVATAR_BYTES } from '../../server/avatars.mjs'
import { createContentService } from '../../server/content.mjs'

const cleanups = []
afterEach(async () => { await Promise.all(cleanups.splice(0).map(cleanup => cleanup())) })

async function startApi() {
  const users = new Map(['alice', 'bob'].map(id => [id, { displayName: id, avatarUrl: null }]))
  const avatars = new Map()
  const repositories = {
    getUserProfile: async id => users.get(id),
    async saveUserAvatar(userId, data) { const id = randomUUID(); avatars.set(id, { userId, data }); return id },
    async getPublishedAvatar(id) {
      const avatar = avatars.get(id)
      return avatar && users.get(avatar.userId)?.avatarUrl === `/api/avatars/${id}` ? avatar : null
    },
    async updateUserProfile(userId, patch) {
      if (patch.avatarUrl?.startsWith('/api/avatars/') && avatars.get(patch.avatarUrl.split('/').at(-1))?.userId !== userId) {
        throw Object.assign(new Error('请重新选择头像'), { status: 400, code: 'INVALID_AVATAR_URL' })
      }
      const user = users.get(userId)
      user.displayName = patch.displayName
      if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl
      return user
    },
  }
  const authService = { async authenticate(token) {
    if (!users.has(token)) throw Object.assign(new Error('请先登录'), { status: 401, code: 'UNAUTHORIZED' })
    return { userId: token }
  } }
  const app = createApi({ store: { bootstrap: async () => ({ profile: { displayName: '新朋友', streakDays: 9, preferredCompanionId: 'luna' } }) },
    responder: async () => '', authService, repositories,
    avatarService: createAvatarService({ repositories }), contentService: createContentService({ repositories }),
  })
  const server = createServer(app)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanups.push(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections() }))
  const base = `http://127.0.0.1:${server.address().port}`
  const request = (path, options = {}, user = 'alice') => fetch(`${base}/api${path}`, { ...options, headers: { Authorization: `Bearer ${user}`, ...options.headers } })
  return { request, base, avatars }
}

function upload(request, data, mime = 'image/jpeg', user = 'alice') {
  const form = new FormData()
  form.append('avatar', new Blob([data], { type: mime }), 'avatar.jpg')
  return request('/profile/avatar', { method: 'POST', body: form }, user)
}

async function jpeg() { return sharp({ create: { width: 24, height: 32, channels: 3, background: '#be8fac' } }).jpeg().toBuffer() }

describe('avatar upload and profile HTTP flow', () => {
  it('advertises the registered avatar routes without requiring a session', async () => {
    const { base } = await startApi()
    expect(await (await fetch(`${base}/api/health`)).json()).toEqual({ ok: true, authMode: 'provider', capabilities: { avatarUpload: true } })
    const missing = await fetch(`${base}/api/avatars/00000000-0000-0000-0000-000000000000`)
    expect(missing.status).toBe(404)
    expect((await missing.json()).error.code).toBe('AVATAR_NOT_FOUND')
  })

  it('authenticates uploads and rejects excessive, corrupt, or unsupported images', async () => {
    const { request } = await startApi()
    expect((await upload(request, await jpeg(), 'image/jpeg', '')).status).toBe(401)
    expect((await upload(request, Buffer.alloc(MAX_AVATAR_BYTES + 1))).status).toBe(413)
    const corrupt = await upload(request, Buffer.from('not an image'))
    expect(corrupt.status).toBe(400)
    expect((await corrupt.json()).error.code).toBe('INVALID_AVATAR_IMAGE')
    const svg = await upload(request, Buffer.from('<svg width="10" height="10"></svg>'), 'image/svg+xml')
    expect(svg.status).toBe(400)
  })

  it('normalizes an avatar, validates ownership, and restores the saved profile at bootstrap', async () => {
    const { request, base, avatars } = await startApi()
    const response = await upload(request, await jpeg())
    expect(response.status).toBe(201)
    const { avatarUrl } = await response.json()
    expect(avatarUrl).toMatch(/^\/api\/avatars\/[a-f0-9-]{36}$/)
    expect(await sharp([...avatars.values()][0].data).metadata()).toMatchObject({ format: 'webp', width: 512, height: 512 })
    expect((await fetch(`${base}${avatarUrl}`)).status).toBe(404)
    const patch = { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: '  微信朋友  ', avatarUrl }) }
    expect((await request('/profile', patch, 'bob')).status).toBe(400)
    const saved = await request('/profile', patch)
    expect(await saved.json()).toEqual({ displayName: '微信朋友', avatar: avatarUrl })
    const image = await fetch(`${base}${avatarUrl}`)
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/webp')
    expect(image.headers.get('cross-origin-resource-policy')).toBe('cross-origin')
    expect((await (await request('/bootstrap')).json()).profile).toMatchObject({ displayName: '微信朋友', avatar: avatarUrl, streakDays: 9, preferredCompanionId: 'luna' })
    await request('/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: '新昵称' }) })
    expect((await (await request('/bootstrap')).json()).profile.avatar).toBe(avatarUrl)
  })

  it('does not replace the saved avatar when another image is uploaded but not saved', async () => {
    const { request, base } = await startApi()
    const { avatarUrl } = await (await upload(request, await jpeg())).json()
    await request('/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: 'Alice', avatarUrl }) })
    const other = await (await upload(request, await jpeg())).json()
    expect((await fetch(`${base}${avatarUrl}`)).status).toBe(200)
    expect((await fetch(`${base}${other.avatarUrl}`)).status).toBe(404)
  })
})

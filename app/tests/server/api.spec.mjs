import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { createApi } from '../../server/app.mjs'
import { createStore } from '../../server/store.mjs'

const cleanups = []

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()))
})

async function startApi(dataFile, overrides = {}) {
  const store = createStore(dataFile)
  const app = createApi({
    store,
    responder: async ({ messages }) => `真实模型回复：${messages.at(-1).content}`,
    ...overrides,
  })
  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  cleanups.push(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
  const { port } = server.address()
  return `http://127.0.0.1:${port}/api`
}

function request(base, path, options = {}) {
  return fetch(`${base}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', 'x-heartnest-device': 'device-api-test-0001', ...options.headers },
  })
}

describe('HeartNest API', () => {
  it('reports whether provider authentication is active', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'heartnest-api-health-'))
    cleanups.push(() => rm(directory, { recursive: true, force: true }))

    const deviceBase = await startApi(join(directory, 'device.json'))
    const providerBase = await startApi(join(directory, 'provider.json'), { authService: {} })

    expect(await (await fetch(`${deviceBase}/health`)).json()).toEqual({ ok: true, authMode: 'device', capabilities: { avatarUpload: false } })
    expect(await (await fetch(`${providerBase}/health`)).json()).toEqual({ ok: true, authMode: 'provider', capabilities: { avatarUpload: false } })
  })

  it('persists real user actions and derives stats after a restart', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'heartnest-api-'))
    cleanups.push(() => rm(directory, { recursive: true, force: true }))
    const dataFile = join(directory, 'heartnest.json')
    const base = await startApi(dataFile)

    const initial = await (await request(base, '/bootstrap')).json()
    expect(initial.stats).toEqual({ conversations: 0, memories: 0, activeDays: 0 })
    expect(initial.reviewDays.every((day) => !day.recorded)).toBe(true)

    await request(base, '/state', { method: 'PUT', body: JSON.stringify({ selectedMoodId: 'tired' }) })
    const sent = await (await request(base, '/chats/mika/messages', {
      method: 'POST',
      body: JSON.stringify({ text: '今天真的很累', moodId: 'tired', clientMessageId: 'client-message-0001' }),
    })).json()
    expect(sent.companionMessage.content).toContain('今天真的很累')

    const memoryResponse = await request(base, '/memories', {
      method: 'POST',
      body: JSON.stringify({ companionId: 'mika', messageId: 'client-message-0001' }),
    })
    expect(memoryResponse.status).toBe(201)

    const restartedBase = await startApi(dataFile)
    const persisted = await (await request(restartedBase, '/bootstrap')).json()
    expect(persisted.stats.conversations).toBe(1)
    expect(persisted.stats.memories).toBe(1)
    expect(persisted.reviewDays.some((day) => day.recorded && day.moodId === 'tired')).toBe(true)
  })

  it('rejects requests without an anonymous device identity', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'heartnest-api-auth-'))
    cleanups.push(() => rm(directory, { recursive: true, force: true }))
    const base = await startApi(join(directory, 'heartnest.json'))
    const response = await fetch(`${base}/bootstrap`)
    expect(response.status).toBe(401)
  })
})

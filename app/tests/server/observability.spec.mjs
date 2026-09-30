import { afterEach, describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import { createApi } from '../../server/app.mjs'
import { createStore } from '../../server/store.mjs'
import { createObservability } from '../../server/observability.mjs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const cleanups = []
afterEach(async () => Promise.all(cleanups.splice(0).map((cleanup) => cleanup())))

describe('API observability', () => {
  it('logs request metadata without tokens or message content and exposes metrics', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'heartnest-observability-'))
    cleanups.push(() => rm(directory, { recursive: true, force: true }))
    const sink = { entries: [], write(entry) { this.entries.push(entry) } }
    const observability = createObservability({ sink })
    const app = createApi({ store: createStore(join(directory, 'data.json')), responder: async () => 'ok', observability })
    const server = createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    cleanups.push(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
    const base = `http://127.0.0.1:${server.address().port}`

    await fetch(`${base}/api/chats/mika/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer secret', 'x-heartnest-device': 'device-observe-0001' },
      body: JSON.stringify({ text: 'private words', moodId: 'calm', clientMessageId: 'observe-message-1' }),
    })
    const output = sink.entries.join('\n')
    expect(output).toContain('requestId')
    expect(output).not.toContain('Bearer secret')
    expect(output).not.toContain('private words')
    const metrics = await fetch(`${base}/metrics`).then((response) => response.text())
    expect(metrics).toContain('heartnest_http_requests_total')
    expect(metrics).toContain('heartnest_ai_requests_total')
  })
})

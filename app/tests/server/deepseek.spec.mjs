import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDeepSeekResponder } from '../../server/ai.mjs'

const context = {
  companionId: 'mika',
  moodId: 'tired',
  replyStyle: 'gentle',
  messages: [
    { sender: 'user', content: '昨天有点累' },
    { sender: 'companion', content: '我在听。' },
    { sender: 'user', content: '今天还是很累' },
  ],
}

beforeEach(() => vi.stubGlobal('AbortSignal', { timeout: () => new AbortController().signal }))
afterEach(() => vi.unstubAllGlobals())

describe('DeepSeek responder', () => {
  it('sends conversation context to DeepSeek and reads only final answer text', async () => {
    const fetchMock = vi.fn(async () => Response.json({
      status: 'completed',
      output: [
        { type: 'reasoning', content: [{ type: 'reasoning_text', text: 'private reasoning' }] },
        { type: 'message', content: [{ type: 'output_text', text: ' 我在这里，慢慢说。 ' }] },
      ],
    }))
    vi.stubGlobal('fetch', fetchMock)

    const reply = await createDeepSeekResponder({ apiKey: 'test-key', model: 'deepseek-flash' })(context)
    expect(reply).toBe('我在这里，慢慢说。')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/responses')
    expect(options.headers.Authorization).toBe('Bearer test-key')
    const body = JSON.parse(options.body)
    expect(body).toMatchObject({ model: 'deepseek-flash', reasoning: { effort: 'none' } })
    expect(body.input).toEqual([
      { role: 'user', content: '昨天有点累' },
      { role: 'assistant', content: '我在听。' },
      { role: 'user', content: '今天还是很累' },
    ])
    expect(body.instructions).toContain('Mika')
  })

  it('requires a server-side DeepSeek key', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(createDeepSeekResponder({ apiKey: '' })(context)).rejects.toMatchObject({
      code: 'AI_NOT_CONFIGURED', status: 503,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('propagates DeepSeek rate limits as a retryable API error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: 'Rate limit reached' } }, { status: 429 })))
    await expect(createDeepSeekResponder({ apiKey: 'test-key' })(context)).rejects.toMatchObject({
      code: 'AI_UPSTREAM_ERROR', status: 429,
    })
  })
})

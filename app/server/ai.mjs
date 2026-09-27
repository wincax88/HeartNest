import { companions } from './catalog.mjs'

const styles = {
  gentle: '先接纳情绪，不急于给建议。',
  concise: '简洁回应，一次只聚焦一件事。',
  reflective: '帮用户轻柔地复盘感受和需要。',
}

function extractText(response) {
  return response.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text?.trim()
}

export function createDeepSeekResponder({ apiKey = process.env.DEEPSEEK_API_KEY, model = process.env.DEEPSEEK_MODEL || 'deepseek-flash' } = {}) {
  return async ({ companionId, moodId, messages, replyStyle }) => {
    if (!apiKey) {
      const error = new Error('陪伴服务尚未配置')
      error.code = 'AI_NOT_CONFIGURED'
      error.status = 503
      throw error
    }
    const companion = companions.find((item) => item.id === companionId)
    const input = messages.slice(-12).map((message) => ({
      role: message.sender === 'companion' ? 'assistant' : 'user',
      content: message.content,
    }))
    const response = await fetch('https://api.deepseek.com/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        reasoning: { effort: 'none' },
        max_output_tokens: 320,
        instructions: `你是 HeartNest 的情绪陪伴者 ${companion?.name}。${companion?.description} ${styles[replyStyle] ?? styles.gentle}
用简体中文回应，控制在 120 字内，不声称自己是人类。当前情绪标记：${moodId}。
不进行医疗诊断。如果用户表达即刻的自伤或他伤危险，清晰建议立即联系当地紧急服务和身边可信任的人。`,
        input,
      }),
      signal: AbortSignal.timeout(30_000),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(payload?.error?.message || '陪伴服务暂时不可用')
      error.code = 'AI_UPSTREAM_ERROR'
      error.status = response.status === 429 ? 429 : 502
      throw error
    }
    if (payload.status !== 'completed') {
      throw Object.assign(new Error('陪伴服务未能完成回复'), { code: 'AI_INCOMPLETE_RESPONSE', status: 502 })
    }
    const text = extractText(payload)
    if (!text) throw Object.assign(new Error('陪伴服务未返回内容'), { code: 'AI_EMPTY_RESPONSE', status: 502 })
    return text
  }
}

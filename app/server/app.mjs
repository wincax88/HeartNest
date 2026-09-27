import express from 'express'
import { randomUUID } from 'node:crypto'
import { companionIds, moodIds, moods } from './catalog.mjs'

const validReplyStyles = new Set(['gentle', 'concise', 'reflective'])

function httpError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

function validateDeviceId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(value)
}

export function createApi({ store, responder }) {
  const app = express()
  const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
  app.disable('x-powered-by')
  app.use(express.json({ limit: '32kb' }))
  app.use('/api', (req, _res, next) => {
    if (req.path === '/health') return next()
    const deviceId = req.get('x-heartnest-device')
    if (!validateDeviceId(deviceId)) return next(httpError(401, 'DEVICE_ID_REQUIRED', '缺少有效的设备标识'))
    req.deviceId = deviceId
    next()
  })

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.get('/api/bootstrap', route(async (req, res) => res.json(await store.bootstrap(req.deviceId))))

  app.put('/api/state', route(async (req, res) => {
    const { selectedMoodId, selectedCompanionId, onboardingCompleted } = req.body ?? {}
    if (selectedMoodId !== undefined && !moodIds.has(selectedMoodId)) throw httpError(400, 'INVALID_MOOD', '情绪选项无效')
    if (selectedCompanionId !== undefined && !companionIds.has(selectedCompanionId)) throw httpError(400, 'INVALID_COMPANION', '陪伴者无效')
    if (onboardingCompleted !== undefined && typeof onboardingCompleted !== 'boolean') throw httpError(400, 'INVALID_ONBOARDING_STATE', '引导状态无效')
    const result = await store.update(req.deviceId, (user) => {
      if (selectedMoodId !== undefined) {
        user.state.selectedMoodId = selectedMoodId
        const now = new Date().toISOString()
        const today = now.slice(0, 10)
        const mood = moods.find((item) => item.id === selectedMoodId)
        const existing = user.moodRecords.find((item) => item.date.slice(0, 10) === today)
        if (existing) Object.assign(existing, { moodId: selectedMoodId, summary: `今天感到${mood.title}`, date: now })
        else user.moodRecords.push({ id: randomUUID(), date: now, moodId: selectedMoodId, summary: `今天感到${mood.title}` })
      }
      if (selectedCompanionId !== undefined) {
        user.state.selectedCompanionId = selectedCompanionId
        user.profile.preferredCompanionId = selectedCompanionId
      }
      if (onboardingCompleted !== undefined) {
        user.state.onboardingCompleted = onboardingCompleted
        user.preferences.onboardingCompleted = onboardingCompleted
      }
      return user.state
    })
    res.json(result)
  }))

  app.put('/api/preferences', route(async (req, res) => {
    const patch = req.body ?? {}
    if (patch.notificationsEnabled !== undefined && typeof patch.notificationsEnabled !== 'boolean') throw httpError(400, 'INVALID_PREFERENCE', '提醒设置无效')
    if (patch.memoryPromptsEnabled !== undefined && typeof patch.memoryPromptsEnabled !== 'boolean') throw httpError(400, 'INVALID_PREFERENCE', '记忆设置无效')
    if (patch.replyStyle !== undefined && !validReplyStyles.has(patch.replyStyle)) throw httpError(400, 'INVALID_PREFERENCE', '回应风格无效')
    const allowedPatch = {}
    if (patch.notificationsEnabled !== undefined) allowedPatch.notificationsEnabled = patch.notificationsEnabled
    if (patch.memoryPromptsEnabled !== undefined) allowedPatch.memoryPromptsEnabled = patch.memoryPromptsEnabled
    if (patch.replyStyle !== undefined) allowedPatch.replyStyle = patch.replyStyle
    const preferences = await store.update(req.deviceId, (user) => Object.assign(user.preferences, allowedPatch))
    res.json(preferences)
  }))

  app.get('/api/chats/:companionId', route(async (req, res) => {
    if (!companionIds.has(req.params.companionId)) throw httpError(404, 'COMPANION_NOT_FOUND', '陪伴者不存在')
    const thread = await store.update(req.deviceId, (user) => store.findThread(user, req.params.companionId))
    res.json(thread)
  }))

  app.post('/api/chats/:companionId/messages', route(async (req, res) => {
    const companionId = req.params.companionId
    const { text, moodId, clientMessageId } = req.body ?? {}
    if (!companionIds.has(companionId)) throw httpError(404, 'COMPANION_NOT_FOUND', '陪伴者不存在')
    if (!moodIds.has(moodId)) throw httpError(400, 'INVALID_MOOD', '情绪选项无效')
    if (typeof text !== 'string' || !text.trim() || text.trim().length > 2000) throw httpError(400, 'INVALID_MESSAGE', '消息必须为 1–2000 个字符')
    if (typeof clientMessageId !== 'string' || clientMessageId.length > 100) throw httpError(400, 'INVALID_MESSAGE_ID', '消息标识无效')

    const context = await store.update(req.deviceId, (user) => {
      const thread = store.findThread(user, companionId)
      let userMessage = thread.messages.find((item) => item.id === clientMessageId)
      if (!userMessage) {
        userMessage = { id: clientMessageId, sender: 'user', content: text.trim(), createdAt: new Date().toISOString(), status: 'sending' }
        thread.messages.push(userMessage)
      } else {
        userMessage.status = 'sending'
      }
      return { threadId: thread.id, messages: thread.messages.map((item) => ({ ...item })), replyStyle: user.preferences.replyStyle }
    })

    try {
      const content = await responder({ companionId, moodId, messages: context.messages, replyStyle: context.replyStyle })
      const result = await store.update(req.deviceId, (user) => {
        const thread = store.findThread(user, companionId)
        const userMessage = thread.messages.find((item) => item.id === clientMessageId)
        userMessage.status = 'sent'
        let companionMessage = thread.messages.find((item) => item.replyTo === clientMessageId)
        if (!companionMessage) {
          companionMessage = { id: randomUUID(), sender: 'companion', content, createdAt: new Date().toISOString(), status: 'sent', replyTo: clientMessageId }
          thread.messages.push(companionMessage)
        }
        return { threadId: thread.id, userMessage, companionMessage }
      })
      res.status(201).json(result)
    } catch (error) {
      await store.update(req.deviceId, (user) => {
        const message = store.findThread(user, companionId).messages.find((item) => item.id === clientMessageId)
        if (message) message.status = 'failed'
      })
      throw error
    }
  }))

  app.post('/api/memories', route(async (req, res) => {
    const { companionId, messageId } = req.body ?? {}
    const memory = await store.update(req.deviceId, (user) => {
      const thread = user.threads.find((item) => item.companionId === companionId)
      const message = thread?.messages.find((item) => item.id === messageId && item.sender === 'user' && item.status === 'sent')
      if (!message) throw httpError(404, 'MESSAGE_NOT_FOUND', '找不到可保存的消息')
      const existing = user.memories.find((item) => item.sourceMessageId === messageId)
      if (existing) return existing
      const created = { id: randomUUID(), title: '你留下的片段', summary: message.content.slice(0, 120), createdAt: new Date().toISOString(), sourceThreadId: thread.id, sourceMessageId: messageId, type: 'moment', retained: true }
      user.memories.push(created)
      return created
    })
    res.status(201).json(memory)
  }))

  app.delete('/api/memories/:id', route(async (req, res) => {
    await store.update(req.deviceId, (user) => {
      const memory = user.memories.find((item) => item.id === req.params.id)
      if (!memory) throw httpError(404, 'MEMORY_NOT_FOUND', '记忆不存在')
      memory.retained = false
    })
    res.status(204).end()
  }))

  app.post('/api/membership/trial', route(async (req, res) => {
    const membership = await store.update(req.deviceId, (user) => {
      if (user.membership.tier === 'pro') return user.membership
      const trialEndsAt = new Date(Date.now() + 7 * 86_400_000).toISOString()
      user.membership = { tier: 'pro', title: '心栖试用会员', benefits: ['无限对话', '长期记忆', '夜间专属模式'], trialEndsAt }
      return user.membership
    })
    res.json(membership)
  }))

  app.post('/api/feedback', route(async (req, res) => {
    const content = req.body?.content?.trim()
    if (!content || content.length > 2000) throw httpError(400, 'INVALID_FEEDBACK', '反馈必须为 1–2000 个字符')
    const feedback = await store.update(req.deviceId, (user) => {
      const item = { id: randomUUID(), content, createdAt: new Date().toISOString() }
      user.feedback.push(item)
      return item
    })
    res.status(201).json(feedback)
  }))

  app.use('/api', (_req, _res, next) => next(httpError(404, 'API_NOT_FOUND', '接口不存在')))

  app.use((error, _req, res, _next) => {
    const status = error instanceof SyntaxError && 'body' in error ? 400 : (Number.isInteger(error.status) ? error.status : 500)
    if (status >= 500) console.error(error)
    res.status(status).json({ error: { code: error.code ?? (status === 400 ? 'INVALID_JSON' : 'INTERNAL_ERROR'), message: status === 500 ? '服务器暂时开了个小差' : error.message } })
  })
  return app
}

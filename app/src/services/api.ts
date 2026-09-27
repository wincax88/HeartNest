import type { AppPreferences, BootstrapData, ChatMessage, ChatThread, CompanionId, Membership, MemoryItem, MoodId } from '@/domain/models'

interface ApiErrorBody { error?: { code?: string; message?: string } }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `hn-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
}

function deviceId(): string {
  const storageKey = 'heartnest-device-id'
  const existing = uni.getStorageSync(storageKey)
  if (typeof existing === 'string' && existing.length >= 16) return existing
  const created = randomId()
  uni.setStorageSync(storageKey, created)
  return created
}

function request<T>(path: string, method: UniApp.RequestOptions['method'] = 'GET', data?: UniApp.RequestOptions['data']): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${apiBase}${path}`,
      method,
      data,
      timeout: 35_000,
      header: { 'X-HeartNest-Device': deviceId() },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T)
          return
        }
        const body = response.data as ApiErrorBody
        reject(new ApiError(response.statusCode, body?.error?.code ?? 'REQUEST_FAILED', body?.error?.message ?? '请求失败'))
      },
      fail(error) {
        reject(new ApiError(0, 'NETWORK_ERROR', error.errMsg || '无法连接服务器'))
      },
    })
  })
}

export const api = {
  bootstrap: () => request<BootstrapData>('/bootstrap'),
  updateState: (patch: Partial<BootstrapData['state']>) => request<BootstrapData['state']>('/state', 'PUT', patch),
  updatePreferences: (patch: Partial<AppPreferences>) => request<AppPreferences>('/preferences', 'PUT', patch),
  getChat: (companionId: CompanionId) => request<ChatThread>(`/chats/${companionId}`),
  sendMessage: (companionId: CompanionId, body: { text: string; moodId: MoodId; clientMessageId: string }) =>
    request<{ threadId: string; userMessage: ChatMessage; companionMessage: ChatMessage }>(`/chats/${companionId}/messages`, 'POST', body),
  saveMemory: (companionId: CompanionId, messageId: string) => request<MemoryItem>('/memories', 'POST', { companionId, messageId }),
  deleteMemory: (id: string) => request<void>(`/memories/${id}`, 'DELETE'),
  activateTrial: () => request<Membership>('/membership/trial', 'POST'),
  submitFeedback: (content: string) => request<{ id: string; createdAt: string }>('/feedback', 'POST', { content }),
}

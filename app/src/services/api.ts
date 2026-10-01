import type { AppPreferences, BootstrapData, ChatMessage, ChatThread, CompanionId, Entitlements, FavoriteItem, Membership, MemoryItem, MoodId, NotificationConfiguration, PaymentOrder, ReminderInput, ReminderSchedule, UserProfile } from '@/domain/models'

interface ApiErrorBody { error?: { code?: string; message?: string } }
export interface SessionResponse { userId: string; accessToken: string; refreshToken: string; expiresIn: number }
export interface ConsentVersions { privacyVersion: string; termsVersion: string; aiVersion: string }
export type ProfileUpdate = Pick<UserProfile, 'displayName' | 'avatar'>

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const refreshStorageKey = 'heartnest-refresh-token'
let accessToken = ''
let refreshInFlight: Promise<void> | null = null

function storedRefreshToken(): string {
  const value = uni.getStorageSync(refreshStorageKey)
  return typeof value === 'string' ? value : ''
}

export function hasStoredSession(): boolean {
  return storedRefreshToken().length > 0
}

export function setSession(session: SessionResponse): void {
  accessToken = session.accessToken
  uni.setStorageSync(refreshStorageKey, session.refreshToken)
}

export function clearSession(): void {
  accessToken = ''
  uni.removeStorageSync(refreshStorageKey)
}

function rawRequest<T>(
  path: string,
  method: UniApp.RequestOptions['method'] | 'PATCH' = 'GET',
  data?: UniApp.RequestOptions['data'],
  options: { authenticated?: boolean; retry?: boolean } = {},
): Promise<T> {
  const authenticated = options.authenticated !== false
  const retry = options.retry !== false
  return new Promise((resolve, reject) => {
    const header: Record<string, string> = {}
    if (authenticated && accessToken) header.Authorization = `Bearer ${accessToken}`
    uni.request({
      url: `${apiBase}${path}`,
      method: method as UniApp.RequestOptions['method'],
      data,
      timeout: 35_000,
      header,
      async success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T)
          return
        }
        const body = response.data as ApiErrorBody
        const error = new ApiError(response.statusCode, body?.error?.code ?? 'REQUEST_FAILED', body?.error?.message ?? '请求失败')
        if (authenticated && retry && response.statusCode === 401 && storedRefreshToken()) {
          try {
            await refreshSession()
            resolve(await rawRequest<T>(path, method, data, { authenticated, retry: false }))
          } catch (refreshError) {
            clearSession()
            reject(refreshError)
          }
          return
        }
        reject(error)
      },
      fail(error) {
        reject(new ApiError(0, 'NETWORK_ERROR', error.errMsg || '无法连接服务器'))
      },
    })
  })
}

export async function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest<SessionResponse>(
      '/auth/refresh',
      'POST',
      { refreshToken: storedRefreshToken() },
      { authenticated: false, retry: false },
    ).then(setSession).finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

function avatarUrlForDisplay(value?: string | null): string | undefined {
  if (value?.startsWith('/api/avatars/')) return `${apiBase}/avatars/${value.slice('/api/avatars/'.length)}`
  return value || undefined
}

function uploadAvatar(filePath: string, retry = true): Promise<{ avatarUrl: string }> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${apiBase}/profile/avatar`, filePath, name: 'avatar', timeout: 35_000,
      header: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      async success(response) {
        let body: ApiErrorBody & { avatarUrl?: string }
        try { body = JSON.parse(response.data) }
        catch { reject(new ApiError(response.statusCode, 'INVALID_UPLOAD_RESPONSE', '头像上传失败，请重试')); return }
        if (!body || typeof body !== 'object') { reject(new ApiError(response.statusCode, 'INVALID_UPLOAD_RESPONSE', '头像上传失败，请重试')); return }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          if (!/^\/api\/avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(body.avatarUrl || '')) {
            reject(new ApiError(response.statusCode, 'INVALID_UPLOAD_RESPONSE', '头像上传失败，请重试')); return
          }
          resolve({ avatarUrl: body.avatarUrl! }); return
        }
        if (retry && response.statusCode === 401 && storedRefreshToken()) {
          try { await refreshSession() }
          catch (error) { clearSession(); reject(error); return }
          try { resolve(await uploadAvatar(filePath, false)) } catch (error) { reject(error) }
          return
        }
        if (response.statusCode === 404 && body.error?.code === 'API_NOT_FOUND') {
          reject(new ApiError(404, 'AVATAR_UPLOAD_UNAVAILABLE', '头像上传服务尚未就绪，请稍后再试')); return
        }
        reject(new ApiError(response.statusCode, body?.error?.code || 'UPLOAD_FAILED', body?.error?.message || '头像上传失败，请重试'))
      },
      fail(error) {
        const reason = error.errMsg || ''
        if (/not in domain list/i.test(reason)) {
          reject(new ApiError(0, 'UPLOAD_DOMAIN_NOT_ALLOWED', '头像上传服务暂不可用，请稍后再试'))
        } else if (/timeout|timed out/i.test(reason)) {
          reject(new ApiError(0, 'UPLOAD_TIMEOUT', '头像上传超时，请重试'))
        } else {
          reject(new ApiError(0, 'NETWORK_ERROR', '头像上传失败，请检查网络后重试'))
        }
      },
    })
  })
}

export const api = {
  loginWithProvider: (provider: 'wechat_mini_program' | 'wechat_app' | 'wechat_h5', code: string) =>
    rawRequest<SessionResponse>('/auth/provider', 'POST', { provider, code }, { authenticated: false }),
  refreshSession,
  logout: async () => {
    const refreshToken = storedRefreshToken()
    if (refreshToken) await rawRequest<void>('/auth/logout', 'POST', { refreshToken }, { authenticated: false, retry: false })
    clearSession()
  },
  acceptConsent: (versions: ConsentVersions) => rawRequest('/privacy/consents', 'POST', versions),
  createDataExport: () => rawRequest<{ id: string; downloadToken: string; expiresAt: string }>('/privacy/exports', 'POST'),
  requestAccountDeletion: () => rawRequest<{ status: string; deleteAfter: string }>('/account/deletion', 'POST'),
  cancelAccountDeletion: () => rawRequest<{ status: string }>('/account/deletion', 'DELETE'),
  favoriteMessage: (messageId: string) => rawRequest<{ id: string; targetId: string }>('/favorites', 'POST', { messageId }),
  deleteFavorite: (favoriteId: string) => rawRequest<void>(`/favorites/${favoriteId}`, 'DELETE'),
  getFavorites: () => rawRequest<FavoriteItem[]>('/favorites'),
  uploadAvatar,
  updateProfile: async (profile: { displayName: string; avatarUrl?: string | null }): Promise<ProfileUpdate> => {
    const result = await rawRequest<{ displayName: string; avatar?: string | null }>('/profile', 'PATCH', profile)
    return { displayName: result.displayName, avatar: avatarUrlForDisplay(result.avatar) }
  },
  getReview: (filters: { from: string; to: string; mood?: string }) => rawRequest<Array<{ id: string; moodId: MoodId; summary: string; recordedAt: string }>>(`/review?from=${encodeURIComponent(filters.from)}&to=${encodeURIComponent(filters.to)}${filters.mood ? `&mood=${encodeURIComponent(filters.mood)}` : ''}`),
  getEntitlements: () => rawRequest<Entitlements>('/entitlements'),
  createPaymentOrder: (productId: string, clientType: 'mini' | 'app' | 'h5') => rawRequest<PaymentOrder>('/payments/orders', 'POST', { productId, clientType }),
  getPaymentOrder: (orderId: string) => rawRequest<PaymentOrder>(`/payments/orders/${orderId}`),
  registerNotificationDevice: (input: { platform: 'app'; token: string; status?: 'active' | 'revoked' }) => rawRequest('/notifications/devices', 'POST', input),
  getNotificationConfiguration: () => rawRequest<NotificationConfiguration>('/notifications/config'),
  authorizeNotification: (input: { channel: 'wechat'; templateId: string; code: string }) => rawRequest('/notifications/authorizations', 'POST', input),
  getReminders: () => rawRequest<ReminderSchedule[]>('/reminders'),
  createReminder: (input: ReminderInput) => rawRequest<ReminderSchedule>('/reminders', 'POST', input),
  updateReminder: (id: string, input: ReminderInput) => rawRequest<ReminderSchedule>(`/reminders/${id}`, 'PUT', input),
  deleteReminder: (id: string) => rawRequest<void>(`/reminders/${id}`, 'DELETE'),
  bootstrap: async () => {
    const data = await rawRequest<BootstrapData>('/bootstrap')
    return { ...data, profile: { ...data.profile, avatar: avatarUrlForDisplay(data.profile.avatar) } }
  },
  updateState: (patch: Partial<BootstrapData['state']>) => rawRequest<BootstrapData['state']>('/state', 'PUT', patch),
  updatePreferences: (patch: Partial<AppPreferences>) => rawRequest<AppPreferences>('/preferences', 'PUT', patch),
  getChat: (companionId: CompanionId) => rawRequest<ChatThread>(`/chats/${companionId}`),
  sendMessage: (companionId: CompanionId, body: { text: string; moodId: MoodId; clientMessageId: string }) =>
    rawRequest<{ threadId: string; userMessage: ChatMessage; companionMessage: ChatMessage }>(`/chats/${companionId}/messages`, 'POST', body),
  saveMemory: (companionId: CompanionId, messageId: string) => rawRequest<MemoryItem>('/memories', 'POST', { companionId, messageId }),
  deleteMemory: (id: string) => rawRequest<void>(`/memories/${id}`, 'DELETE'),
  activateTrial: () => rawRequest<Membership>('/membership/trial', 'POST'),
  submitFeedback: (content: string) => rawRequest<{ id: string; createdAt: string }>('/feedback', 'POST', { content }),
}

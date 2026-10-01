import { afterEach, vi } from 'vitest'
import { companions, memories, moods, memberships, preferences, profile, reviewDays } from './fixtures/data'

export const apiMock = {
  bootstrap: vi.fn(async () => ({
    companions, moods, profile: { ...profile }, membership: memberships.free, preferences: { ...preferences },
    state: { selectedMoodId: 'calm', selectedCompanionId: 'mika', onboardingCompleted: false },
    reviewDays, memories,
    stats: { conversations: 0, memories: 3, activeDays: 7 },
    companionStats: { mika: { conversations: 0 }, luna: { conversations: 0 }, aiden: { conversations: 0 } },
  })),
  updateState: vi.fn(async (patch) => patch),
  updatePreferences: vi.fn(async (patch) => ({ ...preferences, ...patch })),
  getChat: vi.fn(async (companionId) => ({ id: `thread-${companionId}`, companionId, createdAt: new Date().toISOString(), messages: [] })),
  sendMessage: vi.fn(async (companionId, body) => ({
    threadId: `thread-${companionId}`,
    userMessage: { id: body.clientMessageId, sender: 'user', content: body.text, createdAt: new Date().toISOString(), status: 'sent' },
    companionMessage: { id: 'reply-1', sender: 'companion', content: body.text.includes('累') ? '听起来你今天撑了很久。' : '我在这里。', createdAt: new Date().toISOString(), status: 'sent' },
  })),
  saveMemory: vi.fn(async () => memories[0]),
  deleteMemory: vi.fn(async () => undefined),
  activateTrial: vi.fn(async () => memberships.pro),
  submitFeedback: vi.fn(async () => ({ id: 'feedback-1', createdAt: new Date().toISOString() })),
  loginWithProvider: vi.fn(async () => ({ userId: 'user-1', accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 })),
  refreshSession: vi.fn(async () => undefined),
  logout: vi.fn(async () => undefined),
  acceptConsent: vi.fn(async () => ({ id: 'consent-1' })),
  createDataExport: vi.fn(async () => ({ id: 'export-1', downloadToken: 'token', expiresAt: new Date().toISOString() })),
  requestAccountDeletion: vi.fn(async () => ({ status: 'deletion_pending', deleteAfter: new Date().toISOString() })),
  cancelAccountDeletion: vi.fn(async () => ({ status: 'active' })),
  favoriteMessage: vi.fn(async (messageId) => ({ id: `favorite-${messageId}`, targetId: messageId })),
  deleteFavorite: vi.fn(async () => undefined),
  getFavorites: vi.fn(async () => []),
  updateProfile: vi.fn(async (input) => ({ displayName: input.displayName, avatar: input.avatarUrl || undefined })),
  uploadAvatar: vi.fn(async () => ({ avatarUrl: '/api/avatars/12345678-1234-1234-1234-123456789abc' })),
  getReview: vi.fn(async () => []),
  getEntitlements: vi.fn(async () => ({ plan: 'free', capabilities: { daily_chat: { enabled: true, limit: 20, used: 0, remaining: 20, resetAt: null } } })),
  createPaymentOrder: vi.fn(async () => ({ id: 'order-1', status: 'pending', amount: 1800, currency: 'CNY' })),
  getPaymentOrder: vi.fn(async () => ({ id: 'order-1', status: 'pending', amount: 1800, currency: 'CNY' })),
  registerNotificationDevice: vi.fn(async () => ({ id: 'device-1' })),
  authorizeNotification: vi.fn(async () => ({ status: 'authorized' })),
  getNotificationConfiguration: vi.fn(async () => ({ wechat: { available: true, templateId: 'reminder-template' }, app: { available: true } })),
  getReminders: vi.fn(async () => []),
  createReminder: vi.fn(async (input) => ({ id: 'reminder-1', ...input, nextDeliveryAt: new Date().toISOString() })),
  updateReminder: vi.fn(async (id, input) => ({ id, ...input, nextDeliveryAt: new Date().toISOString() })),
  deleteReminder: vi.fn(async () => undefined),
}

vi.mock('@/services/api', () => ({
  api: apiMock,
  setSession: vi.fn(),
  clearSession: vi.fn(),
  hasStoredSession: vi.fn(() => false),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message) }
  },
}))

afterEach(() => {
  globalThis.localStorage?.clear()
  vi.clearAllMocks()
})

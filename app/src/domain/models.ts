export type CompanionId = 'mika' | 'luna' | 'aiden'
export type MoodId = 'calm' | 'tired' | 'anxious' | 'talk'
export type MessageSender = 'user' | 'companion'
export type MessageStatus = 'sending' | 'sent' | 'failed'

export interface Companion {
  id: CompanionId
  name: string
  chineseName: string
  role: string
  tagline: string
  description: string
  traits: string[]
  avatar: string
  cardImage: string
  profileImage: string
  accent: 'rose' | 'violet' | 'blue'
  quote: string
  preferredHours: string
}

export interface MoodOption {
  id: MoodId
  title: string
  icon: string
  score: number
}

export interface MoodRecord {
  id: string
  date: string
  moodId: MoodId
  summary: string
  threadId?: string
}

export interface ChatMessage {
  id: string
  sender: MessageSender
  content: string
  createdAt: string
  status: MessageStatus
  memoryId?: string
  replyTo?: string
}

export interface ChatThread {
  id: string
  companionId: CompanionId
  createdAt: string
  messages: ChatMessage[]
}

export interface MemoryItem {
  id: string
  title: string
  summary: string
  createdAt: string
  sourceThreadId: string
  type: 'emotion' | 'moment' | 'preference'
  retained: boolean
}

export interface ReviewDay {
  date: string
  weekday: string
  score: number
  moodId: MoodId
  label: string
  summary: string
  keywords: string[]
  recorded?: boolean
}

export interface UserProfile {
  displayName: string
  avatar?: string
  streakDays: number
  preferredCompanionId: CompanionId
}

export interface Membership {
  tier: 'free' | 'pro'
  title: string
  benefits: string[]
  trialEndsAt?: string
}

export interface Entitlements {
  plan: 'free' | 'pro'
  capabilities: Record<string, { enabled: boolean; limit: number | null; used: number; remaining: number | null; resetAt: string | null }>
}

export interface PaymentOrder {
  id: string
  status: 'created' | 'pending' | 'confirming' | 'paid' | 'failed' | 'closed'
  amount: number
  currency: string
  merchantOrderNo?: string
  platform?: { prepayId?: string }
}

export interface FavoriteItem {
  id: string
  targetId: string
  content: string
  companionId: CompanionId
  messageCreatedAt: string
  createdAt: string
}

export interface ReminderSchedule {
  id: string
  channel: 'wechat' | 'app'
  time: string
  timeZone: string
  quietStart: string
  quietEnd: string
  enabled: boolean
  nextDeliveryAt: string
}

export interface NotificationConfiguration {
  wechat: { available: boolean; templateId: string | null }
  app: { available: boolean }
}

export type ReminderInput = Omit<ReminderSchedule, 'id' | 'nextDeliveryAt'> & { target: Record<string, string>; payload: Record<string, unknown> }

export interface AppPreferences {
  notificationsEnabled: boolean
  replyStyle: 'gentle' | 'concise' | 'reflective'
  memoryPromptsEnabled: boolean
  onboardingCompleted: boolean
}

export interface UserStats {
  conversations: number
  memories: number
  activeDays: number
}

export interface BootstrapData {
  companions: Companion[]
  moods: MoodOption[]
  profile: UserProfile
  membership: Membership
  preferences: AppPreferences
  state: {
    selectedMoodId: MoodId
    selectedCompanionId: CompanionId
    onboardingCompleted: boolean
  }
  reviewDays: ReviewDay[]
  memories: MemoryItem[]
  stats: UserStats
  companionStats: Record<CompanionId, { conversations: number }>
}

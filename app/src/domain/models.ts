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
}

export interface AppPreferences {
  notificationsEnabled: boolean
  replyStyle: 'gentle' | 'concise' | 'reflective'
  memoryPromptsEnabled: boolean
  onboardingCompleted: boolean
}

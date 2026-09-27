import type { AppPreferences, Companion, Membership, MoodOption, ReviewDay, MemoryItem, UserProfile } from '@/domain/models'

export const companions: Companion[] = [
  { id: 'mika', name: 'Mika', chineseName: '弥卡', role: 'Warm Presence', tagline: '今晚，我在这里', description: '温柔陪伴', traits: ['温柔'], avatar: '/static/heartnest/mika-profile.jpg', cardImage: '/static/heartnest/mika-profile.jpg', profileImage: '/static/heartnest/mika-profile.jpg', accent: 'rose', quote: '我在这里。', preferredHours: '22:00 – 02:00' },
  { id: 'luna', name: 'Luna', chineseName: '露娜', role: 'Patient Listener', tagline: '慢慢说', description: '耐心倾听', traits: ['倾听'], avatar: '/static/heartnest/luna-card.jpg', cardImage: '/static/heartnest/luna-card.jpg', profileImage: '/static/heartnest/luna-card.jpg', accent: 'violet', quote: '慢慢说。', preferredHours: '全天' },
  { id: 'aiden', name: 'Aiden', chineseName: '艾登', role: 'Clear Thinker', tagline: '一起理清', description: '理清问题', traits: ['清晰'], avatar: '/static/heartnest/aiden-card.jpg', cardImage: '/static/heartnest/aiden-card.jpg', profileImage: '/static/heartnest/aiden-card.jpg', accent: 'blue', quote: '一起理清。', preferredHours: '08:00 – 23:00' },
]

export const moods: MoodOption[] = [
  { id: 'calm', title: '平静', icon: 'circle', score: 4 }, { id: 'tired', title: '有点累', icon: 'moon', score: 2 },
  { id: 'anxious', title: '有点焦虑', icon: 'help', score: 1 }, { id: 'talk', title: '想说说话', icon: 'chatbubble', score: 3 },
]
export const profile: UserProfile = { displayName: 'Michael', streakDays: 7, preferredCompanionId: 'mika' }
export const preferences: AppPreferences = { notificationsEnabled: true, replyStyle: 'gentle', memoryPromptsEnabled: true, onboardingCompleted: false }
export const memberships: Record<'free' | 'pro', Membership> = {
  free: { tier: 'free', title: '心栖体验', benefits: [] }, pro: { tier: 'pro', title: '心栖试用会员', benefits: [] },
}
export const reviewDays: ReviewDay[] = Array.from({ length: 7 }, (_, index) => ({ date: `11/${10 + index}`, weekday: `周${'一二三四五六日'[index]}`, score: index % 4 + 1, moodId: 'calm', label: '平静', summary: '测试记录', keywords: [], recorded: true }))
export const memories: MemoryItem[] = Array.from({ length: 3 }, (_, index) => ({ id: `memory-${index}`, title: '测试片段', summary: '一条用于界面测试的记忆。', createdAt: `2026-11-1${index}T10:00:00Z`, sourceThreadId: 'thread-mika', type: 'moment', retained: true }))

import type { AppPreferences, Membership, UserProfile } from '@/domain/models'

export const defaultProfile: UserProfile = {
  displayName: 'Michael',
  streakDays: 7,
  preferredCompanionId: 'mika',
}

export const memberships: Record<'free' | 'pro', Membership> = {
  free: { tier: 'free', title: '心栖体验', benefits: ['每日对话', '近 7 日回顾', '3 条记忆'] },
  pro: { tier: 'pro', title: '心栖会员', benefits: ['无限对话', '长期记忆', '夜间专属模式'] },
}

export const defaultPreferences: AppPreferences = {
  notificationsEnabled: true,
  replyStyle: 'gentle',
  memoryPromptsEnabled: true,
  onboardingCompleted: false,
}

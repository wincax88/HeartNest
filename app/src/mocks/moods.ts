import type { MoodOption } from '@/domain/models'

export const moods: MoodOption[] = [
  { id: 'calm', title: '平静', icon: 'circle', score: 4 },
  { id: 'tired', title: '有点累', icon: 'moon', score: 2 },
  { id: 'anxious', title: '有点焦虑', icon: 'help', score: 1 },
  { id: 'talk', title: '只是想有人说说话', icon: 'chatbubble', score: 3 },
]

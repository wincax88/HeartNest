import type { MemoryItem, ReviewDay } from '@/domain/models'

export const reviewDays: ReviewDay[] = [
  { date: '11/10', weekday: '周一', score: 2, moodId: 'tired', label: '有点累', summary: '今天更多的是消耗感', keywords: ['工作压力'] },
  { date: '11/11', weekday: '周二', score: 1, moodId: 'anxious', label: '焦虑', summary: '事情堆在一起，很难停下来', keywords: ['夜间清醒'] },
  { date: '11/12', weekday: '周三', score: 3, moodId: 'calm', label: '缓和', summary: '开始找到一点自己的节奏', keywords: ['慢慢恢复'] },
  { date: '11/13', weekday: '周四', score: 2, moodId: 'tired', label: '有点累', summary: '还是有些疲惫', keywords: ['工作压力'] },
  { date: '11/14', weekday: '周五', score: 4, moodId: 'calm', label: '平静', summary: '和 Mika 聊完后，状态轻了一些', keywords: ['慢慢恢复'] },
  { date: '11/15', weekday: '周六', score: 5, moodId: 'calm', label: '轻松', summary: '睡前终于安静下来', keywords: ['夜间清醒'] },
  { date: '11/16', weekday: '周日', score: 6, moodId: 'calm', label: '很好', summary: '今天对自己温柔了一点', keywords: ['慢慢恢复'] },
]

export const initialMemories: MemoryItem[] = [
  { id: 'memory-1', title: '最近在意工作节奏', summary: '工作安排密集时，更容易觉得被消耗。', createdAt: '2026-11-10T21:20:00+08:00', sourceThreadId: 'thread-mika', type: 'emotion', retained: true },
  { id: 'memory-2', title: '夜晚更容易想很多', summary: '安静下来后，白天没说出口的疲惫会出现。', createdAt: '2026-11-12T22:10:00+08:00', sourceThreadId: 'thread-mika', type: 'moment', retained: true },
  { id: 'memory-3', title: '希望有人安静陪着', summary: '比起立刻获得建议，更需要先被听见。', createdAt: '2026-11-14T21:40:00+08:00', sourceThreadId: 'thread-mika', type: 'preference', retained: true },
]

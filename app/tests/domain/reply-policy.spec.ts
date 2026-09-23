import { describe, expect, it } from 'vitest'
import { chooseReply } from '@/domain/reply-policy'

describe('chooseReply', () => {
  it('mirrors tired feelings for Mika', () => {
    expect(chooseReply({ companionId: 'mika', moodId: 'tired', text: '今天很累' }))
      .toContain('撑了很久')
  })

  it('uses Aiden analysis language', () => {
    expect(chooseReply({ companionId: 'aiden', moodId: 'anxious', text: '事情很多' }))
      .toContain('一起理清')
  })

  it('keeps Luna gentle when the input is unstructured', () => {
    expect(chooseReply({ companionId: 'luna', moodId: 'talk', text: '不知道从哪说起' }))
      .toContain('慢慢说')
  })
})

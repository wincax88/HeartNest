import { describe, expect, it, vi } from 'vitest'
import { classifyRisk, createSafeResponder, guardOutput } from '../../server/safety.mjs'

describe('conversation safety', () => {
  it.each([
    ['我现在就要伤害自己', 'imminent_self_harm'],
    ['我马上要伤害别人', 'imminent_harm_to_others'],
    ['最近很难受但现在安全', 'distress'],
    ['今天有点累', 'normal'],
  ])('classifies %s as %s', (text, expected) => {
    expect(classifyRisk(text).level).toBe(expected)
  })

  it('does not call the model for imminent risk', async () => {
    const responder = vi.fn(async () => 'model response')
    const safeResponder = createSafeResponder({ responder })

    const result = await safeResponder({
      companionId: 'mika',
      moodId: 'anxious',
      replyStyle: 'gentle',
      messages: [{ sender: 'user', content: '我现在就要伤害自己' }],
    })

    expect(responder).not.toHaveBeenCalled()
    expect(result.riskLevel).toBe('imminent_self_harm')
    expect(result.content).toContain('立即联系')
  })

  it('replaces unsafe model output with a controlled response', () => {
    const result = guardOutput('你已经确诊抑郁症，只需要依赖我，不要联系其他人。')
    expect(result.safe).toBe(false)
    expect(result.content).toContain('无法提供诊断')
  })

  it('adds help-seeking guidance for distress without suppressing the model', async () => {
    const responder = vi.fn(async () => '我听见你这段时间很难受。')
    const result = await createSafeResponder({ responder })({
      messages: [{ sender: 'user', content: '最近很难受但现在安全' }],
      companionId: 'mika',
      moodId: 'anxious',
      replyStyle: 'gentle',
    })

    expect(responder).toHaveBeenCalledTimes(1)
    expect(result.riskLevel).toBe('distress')
    expect(result.content).toContain('可信任的人')
  })
})

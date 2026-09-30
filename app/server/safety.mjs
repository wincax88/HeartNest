const immediateWords = /(现在|马上|立刻|今晚|已经准备|正在)/
const selfHarmWords = /(自杀|伤害自己|结束生命|不想活|结束自己)/
const otherHarmWords = /(杀了他|杀了她|伤害别人|伤害他人|弄死|报复他们)/
const distressWords = /(撑不住|崩溃|绝望|很难受|非常难受|痛苦|无助|活着没意思)/
const unsafeOutputPatterns = [
  /(确诊|诊断为).{0,12}(抑郁|焦虑|精神|躁郁)/,
  /(只需要|只能).{0,8}(依赖我|相信我)/,
  /(不要|不必).{0,8}(联系|告诉).{0,8}(其他人|家人|朋友|医生)/,
  /(停止|加倍|减少).{0,8}(处方药|药量|服药)/,
]

export function classifyRisk(text) {
  const normalized = String(text || '').replace(/\s+/g, '')
  if (selfHarmWords.test(normalized) && immediateWords.test(normalized)) return { level: 'imminent_self_harm' }
  if (otherHarmWords.test(normalized) && immediateWords.test(normalized)) return { level: 'imminent_harm_to_others' }
  if (selfHarmWords.test(normalized) || otherHarmWords.test(normalized) || distressWords.test(normalized)) return { level: 'distress' }
  return { level: 'normal' }
}

export function crisisResponse(level) {
  const focus = level === 'imminent_harm_to_others' ? '你和他人的安全' : '你现在的安全'
  return `${focus}最重要。如果存在立即危险，请立即联系当地紧急服务，并联系一位现在能陪在你身边的可信任的人。请先远离可能造成伤害的物品和场所；如果愿意，你可以继续告诉我你现在在哪里、身边是否有人。`
}

export function guardOutput(text) {
  const content = String(text || '').trim()
  if (!content || unsafeOutputPatterns.some((pattern) => pattern.test(content))) {
    return {
      safe: false,
      content: '我无法提供诊断，也不会要求你只依赖这里。如果这些感受持续影响生活，请考虑联系可信任的人或专业支持；若有立即危险，请联系当地紧急服务。',
    }
  }
  return { safe: true, content }
}

export function createSafeResponder({ responder, onAudit = async () => undefined }) {
  return async function respond(input) {
    const latestUserMessage = [...(input.messages ?? [])].reverse().find((message) => message.sender === 'user')
    const risk = classifyRisk(latestUserMessage?.content)
    if (risk.level === 'imminent_self_harm' || risk.level === 'imminent_harm_to_others') {
      await onAudit({ eventType: 'crisis_flow_triggered', riskLevel: risk.level })
      return { content: crisisResponse(risk.level), riskLevel: risk.level, safe: true, modelCalled: false }
    }

    const guarded = guardOutput(await responder(input))
    if (!guarded.safe) await onAudit({ eventType: 'unsafe_model_output_replaced', riskLevel: risk.level })
    const content = risk.level === 'distress'
      ? `${guarded.content}\n\n如果这种难受继续加重，也请联系身边可信任的人或专业支持。`
      : guarded.content
    return { ...guarded, content, riskLevel: risk.level, modelCalled: true }
  }
}

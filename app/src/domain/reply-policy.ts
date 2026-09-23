import type { CompanionId, MoodId } from './models'

export interface ReplyInput {
  companionId: CompanionId
  moodId: MoodId
  text: string
}

const fallbacks: Record<CompanionId, string> = {
  mika: '我在这里。你不用一次说完，我们可以先照顾好这一刻。',
  luna: '慢慢说就好，我会安静地听着，不催你。',
  aiden: '我们可以一起理清这些事情，先从最让你在意的一件开始。',
}

export function chooseReply(input: ReplyInput): string {
  const normalized = input.text.trim()

  if (input.companionId === 'mika' && (input.moodId === 'tired' || /累|疲惫/.test(normalized))) {
    return '听起来你今天撑了很久。先不用急着整理，慢慢说也可以。'
  }

  if (input.companionId === 'aiden') {
    return '事情一下子挤在一起确实会让人焦虑。我们可以一起理清，先找出最紧要的一件。'
  }

  if (input.companionId === 'luna') {
    return '不知道从哪里开始也没关系，慢慢说，我会一直听着。'
  }

  if (input.moodId === 'anxious' || /停不下来|睡不着|焦虑/.test(normalized)) {
    return '脑子一直转的时候，夜晚会显得格外长。我们先陪这一刻慢一点。'
  }

  return fallbacks[input.companionId]
}

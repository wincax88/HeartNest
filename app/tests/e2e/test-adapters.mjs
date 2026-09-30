import { createTestProviderRegistry } from '../../server/auth/providers.mjs'

export function createE2EAdapters({ nodeEnv }) {
  if (nodeEnv !== 'test') throw new Error('E2E adapters are test-only')
  const attempts = new Map()
  return {
    providers: createTestProviderRegistry({ nodeEnv }),
    responder: async ({ messages }) => {
      const id = messages.at(-1)?.id || 'unknown'
      const count = (attempts.get(id) || 0) + 1
      attempts.set(id, count)
      if (messages.at(-1)?.content.includes('测试重试') && count === 1) throw new Error('deterministic model failure')
      return '状态驱动的测试回复'
    },
    payment: {
      configured: true,
      createOrder: async ({ merchantOrderNo }) => ({ platformOrderId: merchantOrderNo, prepayId: `prepay-${merchantOrderNo}` }),
      verifyCallback: async ({ body }) => body.event,
    },
  }
}

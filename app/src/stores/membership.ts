import { defineStore } from 'pinia'
import type { Entitlements, Membership, PaymentOrder } from '@/domain/models'
import { api } from '@/services/api'

const freeMembership: Membership = { tier: 'free', title: '心栖体验', benefits: [] }

export const useMembershipStore = defineStore('membership', {
  state: () => ({ membership: { ...freeMembership }, entitlements: null as Entitlements | null, order: null as PaymentOrder | null, loading: false }),
  actions: {
    hydrate(membership: Membership) { this.membership = membership },
    async load() { this.entitlements = await api.getEntitlements() },
    async purchase(productId: string) {
      this.loading = true
      try {
        let clientType: 'mini' | 'app' | 'h5' = 'mini'
        // #ifdef APP-PLUS
        clientType = 'app'
        // #endif
        // #ifdef H5
        clientType = 'h5'
        // #endif
        const order = await api.createPaymentOrder(productId, clientType)
        this.order = { ...order, status: 'confirming' }
      } finally { this.loading = false }
    },
    async refreshOrder() {
      if (!this.order) return
      this.order = await api.getPaymentOrder(this.order.id)
      if (this.order.status === 'paid') {
        this.membership = { tier: 'pro', title: '心栖会员', benefits: ['无限对话', '长期记忆', '高级回顾'] }
        await this.load()
      }
    },
  },
})

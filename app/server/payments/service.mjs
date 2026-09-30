import { randomBytes } from 'node:crypto'

function paymentError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

function merchantOrderNo(now = new Date()) {
  return `HN${now.toISOString().replace(/\D/g, '').slice(0, 14)}${randomBytes(6).toString('hex')}`
}

export function createPaymentService({ repositories, adapter, clock = () => new Date() }) {
  const requireAdapter = () => {
    if (!adapter?.configured) throw paymentError(503, 'PAYMENT_NOT_CONFIGURED', '支付服务尚未配置')
    return adapter
  }

  return {
    async createOrder(userId, productId, context = {}) {
      const provider = requireAdapter()
      const product = await repositories.getPaymentProduct(productId)
      if (!product?.enabled) throw paymentError(404, 'PAYMENT_PRODUCT_NOT_FOUND', '会员商品不存在')
      const order = await repositories.createPaymentOrder({
        userId,
        product,
        merchantOrderNo: merchantOrderNo(clock()),
      })
      const platform = await provider.createOrder({
        ...context,
        merchantOrderNo: order.merchantOrderNo,
        description: product.title,
        amount: product.amount,
        currency: product.currency,
      })
      return repositories.markPaymentOrderPending(order.id, platform)
    },

    async getOrder(userId, orderId) {
      const order = await repositories.paymentOrderForUser(userId, orderId)
      if (!order) throw paymentError(404, 'PAYMENT_ORDER_NOT_FOUND', '支付订单不存在')
      return order
    },

    async handleWechatCallback({ headers, rawBody, body }) {
      const event = await requireAdapter().verifyCallback({ headers, rawBody, body })
      if (event.status !== 'SUCCESS') return { accepted: true, status: event.status }
      const order = await repositories.completePaymentOrder(event)
      return { accepted: true, orderId: order.id, status: order.status }
    },
  }
}

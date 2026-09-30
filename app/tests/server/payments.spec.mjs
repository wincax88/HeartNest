import { describe, expect, it, vi } from 'vitest'
import { createCipheriv, generateKeyPairSync, sign as signPayload } from 'node:crypto'
import { createPaymentService } from '../../server/payments/service.mjs'
import { createWechatPayAdapter } from '../../server/payments/wechat.mjs'

function fixture() {
  const state = { membership: 'free', grants: 0, orders: new Map() }
  const repositories = {
    getPaymentProduct: vi.fn(async () => ({ id: 'heartnest-pro-monthly', title: '心栖月度会员', amount: 1800, currency: 'CNY', durationDays: 30, enabled: true })),
    createPaymentOrder: vi.fn(async ({ userId, product, merchantOrderNo }) => {
      const order = { id: 'order-1', userId, productId: product.id, amount: product.amount, currency: product.currency, merchantOrderNo, status: 'created' }
      state.orders.set(merchantOrderNo, order)
      return order
    }),
    markPaymentOrderPending: vi.fn(async (orderId, platformPayload) => ({ ...state.orders.values().next().value, id: orderId, status: 'pending', platformPayload })),
    completePaymentOrder: vi.fn(async ({ merchantOrderNo, platformTransactionId, amount, currency }) => {
      const order = state.orders.get(merchantOrderNo)
      if (amount !== order.amount || currency !== order.currency) throw Object.assign(new Error('支付金额不匹配'), { status: 400, code: 'PAYMENT_AMOUNT_MISMATCH' })
      if (order.status !== 'paid') {
        order.status = 'paid'
        order.platformTransactionId = platformTransactionId
        state.grants += 1
        state.membership = 'pro'
      }
      return { ...order, membershipTier: state.membership }
    }),
  }
  const adapter = {
    configured: true,
    createOrder: vi.fn(async ({ merchantOrderNo }) => ({ platformOrderId: merchantOrderNo, prepayId: 'wx-prepay-id' })),
    verifyCallback: vi.fn(async ({ body }) => body.event),
  }
  return { state, repositories, adapter }
}

describe('payment lifecycle', () => {
  it('grants membership only after a verified callback and handles duplicates once', async () => {
    const { state, repositories, adapter } = fixture()
    const service = createPaymentService({ repositories, adapter })

    const order = await service.createOrder('user-1', 'heartnest-pro-monthly', { clientType: 'mini', openId: 'openid' })
    expect(state.membership).toBe('free')

    const callback = {
      merchantOrderNo: order.merchantOrderNo,
      platformTransactionId: 'wx-transaction-1',
      amount: 1800,
      currency: 'CNY',
      status: 'SUCCESS',
    }
    await service.handleWechatCallback({ headers: {}, rawBody: '{}', body: { event: callback } })
    await service.handleWechatCallback({ headers: {}, rawBody: '{}', body: { event: callback } })

    expect(state.membership).toBe('pro')
    expect(state.grants).toBe(1)
    expect(repositories.completePaymentOrder).toHaveBeenCalledTimes(2)
  })

  it('rejects an amount mismatch and never grants membership', async () => {
    const { state, repositories, adapter } = fixture()
    const service = createPaymentService({ repositories, adapter })
    const order = await service.createOrder('user-1', 'heartnest-pro-monthly', { clientType: 'app' })

    await expect(service.handleWechatCallback({
      headers: {}, rawBody: '{}',
      body: { event: { merchantOrderNo: order.merchantOrderNo, platformTransactionId: 'wx-bad-amount', amount: 1, currency: 'CNY', status: 'SUCCESS' } },
    })).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_MISMATCH' })
    expect(state.membership).toBe('free')
  })

  it('fails before creating an order when WeChat Pay is not configured', async () => {
    const { repositories } = fixture()
    const service = createPaymentService({ repositories, adapter: null })

    await expect(service.createOrder('user-1', 'heartnest-pro-monthly', { clientType: 'mini' }))
      .rejects.toMatchObject({ status: 503, code: 'PAYMENT_NOT_CONFIGURED' })
    expect(repositories.createPaymentOrder).not.toHaveBeenCalled()
  })

  it('propagates invalid callback signatures without touching the order', async () => {
    const { repositories, adapter } = fixture()
    adapter.verifyCallback.mockRejectedValue(Object.assign(new Error('签名无效'), { status: 401, code: 'INVALID_PAYMENT_SIGNATURE' }))
    const service = createPaymentService({ repositories, adapter })

    await expect(service.handleWechatCallback({ headers: {}, rawBody: '{}', body: {} }))
      .rejects.toMatchObject({ status: 401, code: 'INVALID_PAYMENT_SIGNATURE' })
    expect(repositories.completePaymentOrder).not.toHaveBeenCalled()
  })

  it('verifies and decrypts an API v3 callback envelope', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const apiV3Key = '0123456789abcdef0123456789abcdef'
    const nonce = '0123456789ab'
    const associatedData = 'transaction'
    const transaction = {
      out_trade_no: 'HN20260930000001',
      transaction_id: 'wx-transaction-fixture',
      trade_state: 'SUCCESS',
      amount: { total: 1800, currency: 'CNY' },
    }
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(apiV3Key), Buffer.from(nonce))
    cipher.setAAD(Buffer.from(associatedData))
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(transaction)), cipher.final(), cipher.getAuthTag()]).toString('base64')
    const body = JSON.stringify({ resource: { algorithm: 'AEAD_AES_256_GCM', ciphertext, nonce, associated_data: associatedData } })
    const timestamp = '1790769600'
    const callbackNonce = 'callback-nonce'
    const signature = signPayload('RSA-SHA256', Buffer.from(`${timestamp}\n${callbackNonce}\n${body}\n`), privateKey).toString('base64')
    const adapter = createWechatPayAdapter({
      mchId: 'merchant', appId: 'app', privateKey, merchantSerial: 'merchant-serial',
      platformCertificate: publicKey, platformCertificateSerial: 'platform-serial',
      apiV3Key, notifyUrl: 'https://example.com/callback',
    }, { now: () => new Date('2026-09-30T12:00:00.000Z') })

    const event = await adapter.verifyCallback({
      headers: {
        'wechatpay-timestamp': timestamp,
        'wechatpay-nonce': callbackNonce,
        'wechatpay-signature': signature,
        'wechatpay-serial': 'platform-serial',
      },
      rawBody: body,
      body: JSON.parse(body),
    })

    expect(event).toEqual({
      merchantOrderNo: transaction.out_trade_no,
      platformTransactionId: transaction.transaction_id,
      amount: 1800,
      currency: 'CNY',
      status: 'SUCCESS',
    })
  })
})

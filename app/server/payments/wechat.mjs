import { createDecipheriv, randomBytes, sign, verify } from 'node:crypto'

function paymentError(status, code, message) {
  return Object.assign(new Error(message), { status, code })
}

function normalizedPem(value) {
  return typeof value === 'string' ? value.replace(/\\n/g, '\n') : value
}

function header(headers, name) {
  if (typeof headers?.get === 'function') return headers.get(name)
  const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === name.toLowerCase())
  return key ? headers[key] : undefined
}

export function decryptWechatResource(resource, apiV3Key) {
  const encrypted = Buffer.from(resource.ciphertext, 'base64')
  if (encrypted.length <= 16) throw paymentError(400, 'INVALID_PAYMENT_CALLBACK', '支付回调密文无效')
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key), Buffer.from(resource.nonce))
  decipher.setAuthTag(encrypted.subarray(encrypted.length - 16))
  if (resource.associated_data) decipher.setAAD(Buffer.from(resource.associated_data))
  const plaintext = Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()])
  return JSON.parse(plaintext.toString('utf8'))
}

export function createWechatPayAdapter(config = {}, { fetchImpl = fetch, now = () => new Date() } = {}) {
  const configured = Boolean(
    config.mchId && config.appId && config.privateKey && config.merchantSerial &&
    config.platformCertificate && config.platformCertificateSerial && config.apiV3Key && config.notifyUrl,
  )

  function authorization(method, path, body) {
    const timestamp = Math.floor(now().getTime() / 1000).toString()
    const nonce = randomBytes(16).toString('hex')
    const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`
    const signature = sign('RSA-SHA256', Buffer.from(message), normalizedPem(config.privateKey)).toString('base64')
    return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.merchantSerial}"`
  }

  return {
    configured,

    async createOrder({ merchantOrderNo, description, amount, currency, clientType, openId }) {
      if (!configured) throw paymentError(503, 'PAYMENT_NOT_CONFIGURED', '支付服务尚未配置')
      const type = clientType === 'app' ? 'app' : 'jsapi'
      if (type === 'jsapi' && !openId) throw paymentError(400, 'PAYMENT_OPENID_REQUIRED', '微信支付需要用户 OpenID')
      const path = `/v3/pay/transactions/${type}`
      const payload = {
        appid: config.appId,
        mchid: config.mchId,
        description,
        out_trade_no: merchantOrderNo,
        notify_url: config.notifyUrl,
        amount: { total: amount, currency },
        ...(type === 'jsapi' ? { payer: { openid: openId } } : {}),
      }
      const body = JSON.stringify(payload)
      const response = await fetchImpl(`https://api.mch.weixin.qq.com${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', authorization: authorization('POST', path, body) },
        body,
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw paymentError(502, 'PAYMENT_UPSTREAM_ERROR', result.message || '微信支付下单失败')
      return { platformOrderId: merchantOrderNo, prepayId: result.prepay_id }
    },

    async verifyCallback({ headers, rawBody, body }) {
      if (!configured) throw paymentError(503, 'PAYMENT_NOT_CONFIGURED', '支付服务尚未配置')
      const timestamp = header(headers, 'wechatpay-timestamp')
      const nonce = header(headers, 'wechatpay-nonce')
      const signature = header(headers, 'wechatpay-signature')
      const serial = header(headers, 'wechatpay-serial')
      const timestampNumber = Number(timestamp)
      if (!timestamp || !nonce || !signature || serial !== config.platformCertificateSerial || !Number.isFinite(timestampNumber)) {
        throw paymentError(401, 'INVALID_PAYMENT_SIGNATURE', '支付回调签名信息无效')
      }
      if (Math.abs(Math.floor(now().getTime() / 1000) - timestampNumber) > 300) {
        throw paymentError(401, 'PAYMENT_CALLBACK_EXPIRED', '支付回调已过期')
      }
      const payloadText = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody || JSON.stringify(body)).toString('utf8')
      const message = `${timestamp}\n${nonce}\n${payloadText}\n`
      const valid = verify('RSA-SHA256', Buffer.from(message), normalizedPem(config.platformCertificate), Buffer.from(signature, 'base64'))
      if (!valid) throw paymentError(401, 'INVALID_PAYMENT_SIGNATURE', '支付回调签名无效')
      const resource = decryptWechatResource(body.resource, config.apiV3Key)
      return {
        merchantOrderNo: resource.out_trade_no,
        platformTransactionId: resource.transaction_id,
        amount: resource.amount?.total,
        currency: resource.amount?.currency,
        status: resource.trade_state,
      }
    },
  }
}

function providerError(code, message, status = 401) {
  return Object.assign(new Error(message), { code, status })
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.errcode) throw providerError('PROVIDER_EXCHANGE_FAILED', payload.errmsg || '微信授权失败')
  return payload
}

export function createWechatProviderRegistry(config, fetchImpl = fetch) {
  const mini = {
    async exchange(code) {
      if (!config.miniAppId || !config.miniSecret) throw providerError('PROVIDER_NOT_CONFIGURED', '微信小程序登录尚未配置', 503)
      const query = new URLSearchParams({ appid: config.miniAppId, secret: config.miniSecret, js_code: code, grant_type: 'authorization_code' })
      const payload = await fetchJson(`https://api.weixin.qq.com/sns/jscode2session?${query}`, fetchImpl)
      return { provider: 'wechat_mini_program', subject: payload.openid, unionId: payload.unionid || null }
    },
  }
  const oauth = (provider, appId, secret) => ({
    async exchange(code) {
      if (!appId || !secret) throw providerError('PROVIDER_NOT_CONFIGURED', '微信登录尚未配置', 503)
      const query = new URLSearchParams({ appid: appId, secret, code, grant_type: 'authorization_code' })
      const payload = await fetchJson(`https://api.weixin.qq.com/sns/oauth2/access_token?${query}`, fetchImpl)
      return { provider, subject: payload.openid, unionId: payload.unionid || null }
    },
  })
  return {
    wechat_mini_program: mini,
    wechat_app: oauth('wechat_app', config.appId, config.appSecret),
    wechat_h5: oauth('wechat_h5', config.h5AppId, config.h5Secret),
  }
}

export function createTestProviderRegistry({ nodeEnv }) {
  if (nodeEnv !== 'test') throw new Error('Test identity providers are available only in NODE_ENV=test')
  const provider = (name) => ({
    async exchange(code) {
      if (typeof code !== 'string' || !code.trim()) throw providerError('INVALID_PROVIDER_CODE', '授权码无效', 400)
      return { provider: name, subject: `test:${code}`, unionId: `test-union:${code}` }
    },
  })
  return {
    wechat_mini_program: provider('wechat_mini_program'),
    wechat_app: provider('wechat_app'),
    wechat_h5: provider('wechat_h5'),
  }
}

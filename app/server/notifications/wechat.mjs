export function createWechatNotificationAdapter({ appId, appSecret, fetchImpl = fetch }) {
  const configured = Boolean(appId && appSecret)
  let tokenCache = null

  async function accessToken() {
    if (tokenCache?.expiresAt > Date.now() + 60_000) return tokenCache.value
    const response = await fetchImpl(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`)
    const body = await response.json()
    if (!response.ok || !body.access_token) throw new Error(body.errmsg || '微信访问令牌获取失败')
    tokenCache = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in || 7200) * 1000 }
    return tokenCache.value
  }

  return {
    configured,
    async send(job) {
      if (!configured) throw new Error('wechat adapter not configured')
      const token = await accessToken()
      const response = await fetchImpl(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ touser: job.target.openId, template_id: job.target.templateId, page: job.target.page, data: job.payload }),
      })
      const body = await response.json()
      if (!response.ok || body.errcode) throw new Error(body.errmsg || '微信订阅消息发送失败')
    },
  }
}

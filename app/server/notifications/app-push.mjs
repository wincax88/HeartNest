export function createAppPushAdapter({ endpoint, key, fetchImpl = fetch }) {
  const configured = Boolean(endpoint && key)
  return {
    configured,
    async send(job) {
      if (!configured) throw new Error('app push adapter not configured')
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ token: job.target.token, ...job.payload }),
      })
      if (!response.ok) throw new Error(`App Push 发送失败 (${response.status})`)
    },
  }
}

import { randomUUID } from 'node:crypto'

const requestIdPattern = /^[a-zA-Z0-9._-]{8,100}$/
const defaultSink = { write: (entry) => console.log(entry) }

function routeCategory(path) {
  if (path.includes('/chats/') && path.endsWith('/messages')) return 'ai'
  if (path.includes('/payments/')) return 'payment'
  if (path.includes('/notifications/') || path.includes('/reminders')) return 'notification'
  return 'http'
}

export function createObservability({ sink = defaultSink, enabled = sink !== defaultSink || process.env.NODE_ENV !== 'test', now = () => Date.now() } = {}) {
  const counters = new Map()
  const durations = new Map()
  const increment = (name, labels) => {
    const key = `${name}|${labels}`
    counters.set(key, (counters.get(key) ?? 0) + 1)
  }

  function middleware(req, res, next) {
    const supplied = req.get('x-request-id')
    req.requestId = requestIdPattern.test(supplied ?? '') ? supplied : randomUUID()
    res.setHeader('x-request-id', req.requestId)
    const startedAt = now()
    res.once('finish', () => {
      const duration = Math.max(0, now() - startedAt)
      const statusClass = `${Math.floor(res.statusCode / 100)}xx`
      const category = routeCategory(req.path)
      increment('heartnest_http_requests_total', `status="${statusClass}"`)
      if (category !== 'http') increment(`heartnest_${category}_requests_total`, `status="${statusClass}"`)
      const durationKey = `status="${statusClass}"`
      durations.set(durationKey, (durations.get(durationKey) ?? 0) + duration)
      if (enabled) sink.write(JSON.stringify({ level: res.statusCode >= 500 ? 'error' : 'info', event: 'http_request', requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: duration }))
    })
    next()
  }

  function error(error, req) {
    if (!enabled) return
    sink.write(JSON.stringify({ level: 'error', event: 'request_error', requestId: req?.requestId, errorName: error?.name ?? 'Error', errorCode: error?.code ?? 'INTERNAL_ERROR' }))
  }

  function metricsHandler(_req, res) {
    const lines = [
      '# HELP heartnest_http_requests_total HTTP requests grouped by status class.',
      '# TYPE heartnest_http_requests_total counter',
    ]
    for (const [key, value] of counters) {
      const [name, labels] = key.split('|')
      lines.push(`${name}{${labels}} ${value}`)
    }
    lines.push('# HELP heartnest_http_request_duration_milliseconds_sum Total HTTP request duration.', '# TYPE heartnest_http_request_duration_milliseconds_sum counter')
    for (const [labels, value] of durations) lines.push(`heartnest_http_request_duration_milliseconds_sum{${labels}} ${value}`)
    for (const name of ['heartnest_ai_requests_total', 'heartnest_payment_requests_total', 'heartnest_notification_requests_total']) {
      if (![...counters.keys()].some((key) => key.startsWith(`${name}|`))) lines.push(`${name}{status="none"} 0`)
    }
    res.type('text/plain; version=0.0.4').send(`${lines.join('\n')}\n`)
  }

  return { middleware, metricsHandler, error }
}

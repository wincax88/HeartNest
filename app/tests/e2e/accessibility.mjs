import { AxeBuilder } from '@axe-core/playwright'
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../../dist/build/h5/', import.meta.url))
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    let path = join(dist, pathname === '/' ? 'index.html' : pathname)
    if (!(await stat(path)).isFile()) path = join(dist, 'index.html')
    response.setHeader('content-type', mime[extname(path)] ?? 'application/octet-stream')
    response.end(await readFile(path))
  } catch { response.statusCode = 404; response.end('Not found') }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const baseUrl = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
const failures = []

try {
  for (const route of ['onboarding', 'home', 'chat', 'review', 'profile']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto(`${baseUrl}/#/pages/${route}/index${route === 'chat' ? '?id=mika' : ''}`, { waitUntil: 'networkidle' })
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    const serious = result.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')
    if (serious.length) failures.push(`${route}: ${serious.map(({ id, nodes }) => `${id}(${nodes.length}) ${nodes.map((node) => node.target.join(' ')).join(' | ')}`).join(', ')}`)
    await context.close()
  }
} finally {
  await browser.close()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

if (failures.length) throw new Error(`Serious accessibility violations:\n${failures.join('\n')}`)
console.log('HeartNest H5 has no serious or critical axe violations on 5 release routes.')

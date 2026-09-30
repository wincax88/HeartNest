import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../../dist/build/h5/', import.meta.url))
const outputDir = new URL('../../artifacts/visual-qa/', import.meta.url)
await mkdir(outputDir, { recursive: true })

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    let path = join(dist, pathname === '/' ? 'index.html' : pathname)
    if (!(await stat(path)).isFile()) path = join(dist, 'index.html')
    response.setHeader('content-type', mime[extname(path)] ?? 'application/octet-stream')
    response.end(await readFile(path))
  } catch {
    response.statusCode = 404
    response.end('Not found')
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const baseUrl = process.env.HEARTNEST_URL ?? `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})

const runtimeErrors = []

const routes = ['onboarding', 'home', 'companion', 'chat', 'review', 'profile', 'settings', 'membership']
for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  page.on('pageerror', (error) => runtimeErrors.push(`${route}: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('404')) runtimeErrors.push(`${route}: ${message.text()}`)
  })
  const suffix = route === 'companion' || route === 'chat' ? '?id=mika' : ''
  await page.goto(`${baseUrl}/#/pages/${route}/index${suffix}`, { waitUntil: 'networkidle' })
  console.log(`${route}: ${(await page.locator('body').innerText()).length} characters, ${await page.locator('uni-icons').count()} unresolved icons`)
  await page.screenshot({ path: fileURLToPath(new URL(`${route}.png`, outputDir)), fullPage: true })
  await page.close()
}

await browser.close()
await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
if (runtimeErrors.length) {
  throw new Error(`Browser runtime errors:\n${runtimeErrors.join('\n')}`)
}

console.log(`Captured ${routes.length} HeartNest screens.`)

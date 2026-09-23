import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseUrl = process.env.HEARTNEST_URL ?? 'http://127.0.0.1:4173'
const outputDir = new URL('../../artifacts/visual-qa/', import.meta.url)
await mkdir(outputDir, { recursive: true })

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
if (runtimeErrors.length) {
  throw new Error(`Browser runtime errors:\n${runtimeErrors.join('\n')}`)
}

console.log(`Captured ${routes.length} HeartNest screens.`)

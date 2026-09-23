import { chromium } from '@playwright/test'

const baseUrl = process.env.HEARTNEST_URL ?? 'http://127.0.0.1:4173'
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
})

const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

await page.goto(`${baseUrl}/#/pages/onboarding/index`, { waitUntil: 'networkidle' })
await page.locator('uni-button').filter({ hasText: '开始体验' }).click()
await page.getByText('晚上好，Michael').waitFor()

await page.getByTestId('companion-mika').click()
await page.getByText('ABOUT ME').waitFor()
await page.getByTestId('profile-chat').click()
await page.getByText('我在这里。').waitFor()

await page.getByTestId('chat-input').locator('input').fill('今天有点累')
await page.getByTestId('chat-send').click()
await page.getByText('听起来你今天撑了很久。先不用急着整理，慢慢说也可以。').waitFor()

await page.goto(`${baseUrl}/#/pages/review/index`, { waitUntil: 'networkidle' })
await page.reload({ waitUntil: 'networkidle' })
if ((await page.getByTestId('review-day').count()) !== 7) throw new Error('Review chart does not contain seven days.')
if ((await page.getByTestId('memory-item').count()) !== 3) throw new Error('Review does not contain three memories.')

await page.goto(`${baseUrl}/#/pages/profile/index`, { waitUntil: 'networkidle' })
await page.reload({ waitUntil: 'networkidle' })
await page.getByTestId('open-settings').click()
await page.getByText('温柔提醒').waitFor()
await page.getByTestId('notification-toggle').click()

await page.goto(`${baseUrl}/#/pages/profile/index`, { waitUntil: 'networkidle' })
await page.reload({ waitUntil: 'networkidle' })
await page.getByTestId('open-membership').click()
await page.getByText('让陪伴，记得更久一点').waitFor()
await page.getByTestId('upgrade-membership').click()
await page.getByText('已解锁心栖会员').waitFor()

await browser.close()
if (errors.length) throw new Error(`Browser runtime errors:\n${errors.join('\n')}`)
console.log('HeartNest end-to-end flow passed.')

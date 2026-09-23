import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface PagesConfig {
  pages: Array<{ path: string }>
}

function readPages(): PagesConfig {
  const raw = readFileSync(resolve(process.cwd(), 'src/pages.json'), 'utf8')
  return JSON.parse(raw.replace(/\/\/.*$/gm, '')) as PagesConfig
}

describe('app shell', () => {
  it('declares every required screen', () => {
    const paths = readPages().pages.map((page) => page.path)

    expect(paths).toEqual(expect.arrayContaining([
      'pages/onboarding/index',
      'pages/home/index',
      'pages/companion/index',
      'pages/chat/index',
      'pages/review/index',
      'pages/profile/index',
      'pages/settings/index',
      'pages/membership/index',
    ]))
  })
})

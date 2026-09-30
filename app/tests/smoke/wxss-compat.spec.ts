import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('WeChat WXSS compatibility', () => {
  it('does not use universal selectors in the reduced-motion rule', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles/global.scss'), 'utf8')
    const reducedMotionRule = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'))

    expect(reducedMotionRule).not.toMatch(/(^|[,{]\s*)\*/m)
  })
})

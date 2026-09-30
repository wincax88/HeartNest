import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('WeChat WXSS compatibility', () => {
  it('does not use universal selectors in the reduced-motion rule', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles/global.scss'), 'utf8')
    const reducedMotionRule = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'))

    expect(reducedMotionRule).not.toMatch(/(^|[,{]\s*)\*/m)
  })

  it('uses native sizing frames instead of max-content on the home page', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/home/index.vue'), 'utf8')

    expect(source).toContain('class="companion-frame"')
    expect(source).toContain('class="companion-card-host"')
    expect(source).toContain('class="night-insight-frame"')
    expect(source).not.toContain('width: max-content')
  })
})

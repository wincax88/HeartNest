import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('mini-program component rendering', () => {
  it('uses the native uni icon font instead of SVG on WeChat', () => {
    const source = readSource('src/components/uni-icons/uni-icons.vue')

    expect(source).toContain("@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue")
    expect(source).toContain('#ifdef MP-WEIXIN')
    expect(source).toContain('<OfficialUniIcons')
  })

  it('renders primary button layout on a native button without a component style boundary', () => {
    const source = readSource('src/components/HnPrimaryButton.vue')

    expect(source).not.toContain("import HnAction from './HnAction.vue'")
    expect(source).toMatch(/<button[\s\S]*class="primary-button"/)
  })
})

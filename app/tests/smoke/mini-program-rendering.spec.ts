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

  it('does not import the SVG icon component into the WeChat build', () => {
    const source = readSource('src/components/uni-icons/uni-icons.vue')

    expect(source).toMatch(/\/\/ #ifdef MP-WEIXIN\s+import OfficialUniIcons/)
    expect(source).toMatch(/\/\/ #ifndef MP-WEIXIN\s+import HnIcon/)
  })

  it('renders primary button layout on a native button without a component style boundary', () => {
    const source = readSource('src/components/HnPrimaryButton.vue')

    expect(source).not.toContain("import HnAction from './HnAction.vue'")
    expect(source).toMatch(/<button[\s\S]*class="primary-button"/)
  })

  it('renders companion card layout on a native button without a nested action boundary', () => {
    const source = readSource('src/components/CompanionCard.vue')

    expect(source).not.toContain("import HnAction from './HnAction.vue'")
    expect(source).toMatch(/<button[\s\S]*class="companion-card"/)
  })

  it('keeps night insight layout inside a fillable glass-card root', () => {
    const home = readSource('src/pages/home/index.vue')
    const glassCard = readSource('src/components/HnGlassCard.vue')

    expect(home).toContain('<HnGlassCard class="night-insight-card" fill>')
    expect(home).toContain('<view class="night-insight-layout">')
    expect(glassCard).toMatch(/defineProps<\{\s*fill\?: boolean\s*\}>/)
    expect(glassCard).toMatch(/\.glass-card\.is-fill\s*\{[^}]*width:\s*100%/s)
  })

  it('pins the primary button arrow inside its circle on WeChat', () => {
    const source = readSource('src/components/HnPrimaryButton.vue')

    expect(source).toContain('class="primary-button__arrow-icon"')
    expect(source).toMatch(/\.primary-button\s*\{[^}]*position:\s*relative/s)
    expect(source).toMatch(/\.primary-button__arrow\s*\{[^}]*position:\s*absolute[^}]*top:\s*50%[^}]*right:\s*12rpx[^}]*transform:\s*translateY\(-50%\)/s)
    expect(source).toMatch(/\.primary-button__arrow-icon\s*\{[^}]*display:\s*block[^}]*width:\s*44rpx[^}]*height:\s*44rpx[^}]*line-height:\s*1/s)
  })
})

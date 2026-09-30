import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OnboardingPage from '@/pages/onboarding/index.vue'

describe('onboarding page', () => {
  const navigateTo = vi.fn()

  beforeEach(() => {
    navigateTo.mockReset()
    vi.stubGlobal('uni', { navigateTo })
  })

  it('groups feature cards and actions in one footer', () => {
    const wrapper = mount(OnboardingPage)
    const footer = wrapper.get('[data-testid="onboarding-footer"]')

    expect(footer.findAll('[data-testid="onboarding-feature"]')).toHaveLength(3)
    expect(footer.get('[data-testid="onboarding-primary"]').text()).toContain('开始体验')
    expect(footer.get('[data-testid="onboarding-secondary"]').text()).toContain('我先看看')
    expect(footer.findAll('[data-testid="onboarding-dot"]')).toHaveLength(3)
  })

  it('updates the active pagination indicator when the swiper changes', async () => {
    const wrapper = mount(OnboardingPage)

    expect(wrapper.findAll('[data-testid="onboarding-dot"]')[0].classes()).toContain('active')
    await wrapper.get('swiper').trigger('change', { detail: { current: 1 } })

    const dots = wrapper.findAll('[data-testid="onboarding-dot"]')
    expect(dots[0].classes()).not.toContain('active')
    expect(dots[1].classes()).toContain('active')
  })

  it('keeps both entry actions routed to consent', async () => {
    const wrapper = mount(OnboardingPage)

    await wrapper.get('[data-testid="onboarding-primary"]').trigger('click')
    await wrapper.get('[data-testid="onboarding-secondary"]').trigger('click')

    expect(navigateTo).toHaveBeenCalledTimes(2)
    expect(navigateTo).toHaveBeenNthCalledWith(1, { url: '/pages/consent/index' })
    expect(navigateTo).toHaveBeenNthCalledWith(2, { url: '/pages/consent/index' })
  })

  it('uses one positioned footer instead of separately positioned feature and action groups', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/onboarding/index.vue'), 'utf8')

    expect(source).toMatch(/\.onboarding__footer\s*\{[^}]*position:\s*absolute/s)
    expect(source).not.toMatch(/\.feature-row\s*\{[^}]*position:\s*absolute/s)
    expect(source).not.toMatch(/\.onboarding__actions\s*\{[^}]*position:\s*absolute/s)
    expect(source).toContain('@media (max-height: 700px)')
  })
})

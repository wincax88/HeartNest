# HeartNest Onboarding Layout Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the onboarding footer into a responsive, safe-area-aware visual hierarchy without changing its content, carousel behavior, or navigation flow.

**Architecture:** Keep the existing single-page Vue component and shared primary button. Group the feature cards and actions under one positioned footer container so their spacing is controlled by normal flex flow, then add a focused component test and a source-level layout regression test. Avoid changes to shared button behavior unless visual verification proves the component itself is defective.

**Tech Stack:** Vue 3 `<script setup>`, uni-app, SCSS/WXSS, Vitest, Vue Test Utils, TypeScript.

---

## File Map

- Create `app/tests/pages/onboarding.spec.ts`: verifies the onboarding content, unified footer structure, carousel state, navigation, and the CSS positioning contract.
- Modify `app/src/pages/onboarding/index.vue`: groups the footer content, adds stable test hooks and accessibility metadata, and replaces competing absolute positions with responsive footer styles.
- Do not modify `app/src/components/HnPrimaryButton.vue` unless the final visual check demonstrates a defect outside the onboarding layout. The existing component already provides the required icon, centered label, arrow, accessible label, and minimum touch size.

### Task 1: Lock Down Onboarding Behavior and Footer Structure

**Files:**
- Create: `app/tests/pages/onboarding.spec.ts`
- Modify: `app/src/pages/onboarding/index.vue:17-37`

- [ ] **Step 1: Write the failing component tests**

Create `app/tests/pages/onboarding.spec.ts` with:

```ts
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
})
```

- [ ] **Step 2: Run the tests and verify the expected failure**

Run:

```powershell
cd C:\github\HeartNest\app
npm test -- tests/pages/onboarding.spec.ts
```

Expected: FAIL because `[data-testid="onboarding-footer"]` does not exist.

- [ ] **Step 3: Introduce the unified footer structure**

Replace the feature and action portion of `app/src/pages/onboarding/index.vue` with:

```vue
    <view class="onboarding__footer" data-testid="onboarding-footer">
      <view class="feature-row" aria-label="HeartNest 核心能力">
        <view data-testid="onboarding-feature"><uni-icons type="heart-filled" :size="26" color="#ffb0cc" /><text>温柔陪伴</text></view>
        <view data-testid="onboarding-feature"><uni-icons type="list" :size="26" color="#c6a3ff" /><text>情绪回顾</text></view>
        <view data-testid="onboarding-feature"><uni-icons type="star-filled" :size="26" color="#ffd29d" /><text>长期记忆</text></view>
      </view>
      <view class="onboarding__actions">
        <HnPrimaryButton data-testid="onboarding-primary" label="开始体验" @click="enter" />
        <button data-testid="onboarding-secondary" class="look-first" @click="enter">
          我先看看 <uni-icons type="right" :size="16" color="#c8cee6" />
        </button>
        <view class="dots" role="tablist" aria-label="欢迎页进度">
          <view
            v-for="(_, index) in slides"
            :key="index"
            data-testid="onboarding-dot"
            role="tab"
            :aria-selected="index === current"
            :class="{ active: index === current }"
          />
        </view>
      </view>
    </view>
```

- [ ] **Step 4: Run the focused tests**

Run:

```powershell
cd C:\github\HeartNest\app
npm test -- tests/pages/onboarding.spec.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the structural behavior change**

```powershell
git add app/tests/pages/onboarding.spec.ts app/src/pages/onboarding/index.vue
git commit -m "test: cover onboarding footer behavior"
```

### Task 2: Replace Competing Positions with Responsive Footer Flow

**Files:**
- Modify: `app/tests/pages/onboarding.spec.ts`
- Modify: `app/src/pages/onboarding/index.vue:40-59`

- [ ] **Step 1: Add the failing layout regression test**

Append these imports and test to `app/tests/pages/onboarding.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

it('uses one positioned footer instead of separately positioned feature and action groups', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/pages/onboarding/index.vue'), 'utf8')

  expect(source).toMatch(/\.onboarding__footer\s*\{[^}]*position:\s*absolute/s)
  expect(source).not.toMatch(/\.feature-row\s*\{[^}]*position:\s*absolute/s)
  expect(source).not.toMatch(/\.onboarding__actions\s*\{[^}]*position:\s*absolute/s)
  expect(source).toContain('@media (max-height: 700px)')
})
```

Place the new `node:fs` and `node:path` imports at the top of the file with the existing imports.

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```powershell
cd C:\github\HeartNest\app
npm test -- tests/pages/onboarding.spec.ts
```

Expected: FAIL because `.feature-row` and `.onboarding__actions` still use `position: absolute`, and the compact-height media query is absent.

- [ ] **Step 3: Implement the approved A “舒展分层” styles**

Replace the scoped style block in `app/src/pages/onboarding/index.vue` with:

```scss
.onboarding {
  min-height: 100vh;
  color: #f8f6ff;
}

.onboarding__bg,
.onboarding__shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.onboarding__shade {
  background: linear-gradient(180deg, rgba(5, 12, 35, 0.18), rgba(5, 12, 35, 0.1) 38%, rgba(5, 12, 35, 0.82) 70%, #050c20 100%);
}

.onboarding__brand {
  position: absolute;
  z-index: 2;
  top: calc(var(--status-bar-height, 24px) + 30rpx);
  left: 42rpx;
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.onboarding__brand > view {
  display: flex;
  flex-direction: column;
}

.onboarding__brand text:first-child {
  font-size: 34rpx;
  font-weight: 700;
}

.onboarding__brand text:last-child {
  color: #d8dced;
  font-size: 20rpx;
}

.onboarding__swiper {
  position: absolute;
  z-index: 2;
  top: 150rpx;
  right: 0;
  left: 0;
  height: 390rpx;
}

.onboarding__copy {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  padding: 60rpx 42rpx;
}

.onboarding__title {
  max-width: 640rpx;
  font-family: Georgia, 'Songti SC', serif;
  font-size: 60rpx;
  font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 4rpx 24rpx rgba(6, 12, 35, 0.8);
}

.onboarding__text {
  max-width: 570rpx;
  color: #d3d8ea;
  font-size: 27rpx;
  line-height: 1.7;
}

.onboarding__footer {
  position: absolute;
  z-index: 3;
  right: 28rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  left: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.feature-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.feature-row > view {
  display: flex;
  min-width: 0;
  min-height: 98rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 14rpx 8rpx;
  border: 1rpx solid rgba(179, 192, 248, 0.22);
  border-radius: 24rpx;
  color: #eef0ff;
  font-size: 22rpx;
  background: rgba(30, 41, 82, 0.66);
  backdrop-filter: blur(20rpx);
}

.onboarding__actions {
  display: flex;
  flex-direction: column;
  padding: 0 14rpx;
}

.look-first {
  display: flex;
  height: 64rpx;
  margin-top: 4rpx;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  color: #c8cee6;
  font-size: 23rpx;
  background: transparent;
}

.dots {
  display: flex;
  height: 18rpx;
  margin-top: 4rpx;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.dots view {
  width: 11rpx;
  height: 11rpx;
  border-radius: 50%;
  background: #77809e;
  transition: width 180ms ease, background-color 180ms ease;
}

.dots view.active {
  width: 34rpx;
  border-radius: 999rpx;
  background: #d390f2;
  box-shadow: 0 0 14rpx rgba(211, 144, 242, 0.72);
}

@media (max-height: 700px) {
  .onboarding__swiper {
    top: 132rpx;
    height: 330rpx;
  }

  .onboarding__copy {
    gap: 14rpx;
    padding-top: 48rpx;
  }

  .onboarding__title {
    font-size: 54rpx;
  }

  .onboarding__footer {
    bottom: calc(16rpx + env(safe-area-inset-bottom));
    gap: 12rpx;
  }

  .feature-row > view {
    min-height: 84rpx;
    gap: 5rpx;
    padding: 10rpx 6rpx;
  }

  .look-first {
    height: 58rpx;
  }
}
```

- [ ] **Step 4: Run the focused tests**

Run:

```powershell
cd C:\github\HeartNest\app
npm test -- tests/pages/onboarding.spec.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Build the WeChat target and inspect generated WXSS**

Run:

```powershell
cd C:\github\HeartNest\app
npm run build:mp-weixin
$css = Get-Content -Raw 'dist/build/mp-weixin/app.wxss'
if ($css -match '(?m)(^|[,{]\s*)\*') { throw 'Generated WXSS contains an unsupported universal selector' }
```

Expected: build exits with code 0 and the WXSS compatibility check produces no error.

- [ ] **Step 6: Commit the responsive layout**

```powershell
git add app/src/pages/onboarding/index.vue app/tests/pages/onboarding.spec.ts
git commit -m "feat: optimize onboarding action hierarchy"
```

### Task 3: Verify Cross-Platform Behavior and Visual Fidelity

**Files:**
- Modify only if verification reveals a concrete regression: `app/src/pages/onboarding/index.vue`

- [ ] **Step 1: Run the complete automated verification suite**

Run:

```powershell
cd C:\github\HeartNest\app
npm test
npm run type-check
npm run build:h5
npm run build:mp-weixin
```

Expected: all tests pass, type-check exits with code 0, and both builds finish with `DONE Build complete`.

- [ ] **Step 2: Verify the normal-height mobile layout**

Open the built onboarding page at a 390 × 844 viewport. Confirm all of the following:

- The title and supporting copy remain readable over the image.
- All three feature cards are visible in one row without truncation or horizontal overflow.
- The feature cards, primary button, secondary action, and pagination have visible separation.
- The primary button label remains centered and its right arrow stays inside the trailing circular container.
- The active pagination indicator is a short capsule; the other two are circles.

- [ ] **Step 3: Verify the compact-height mobile layout**

Repeat at a 375 × 667 viewport. Confirm:

- No footer element overlaps another footer element.
- The footer remains above the bottom safe area.
- The primary and secondary actions remain fully visible and clickable.
- Background content may crop, but controls and copy must not be clipped.

- [ ] **Step 4: Verify interaction behavior**

In either preview:

1. Swipe or dispatch the carousel to slide 2 and confirm the second pagination item becomes active.
2. Return to slide 1 and confirm the first item becomes active.
3. Activate “开始体验” and confirm navigation targets `/pages/consent/index`.
4. Return and activate “我先看看”; confirm it targets the same route.

- [ ] **Step 5: Review the final diff and repository state**

Run:

```powershell
cd C:\github\HeartNest
git diff --check
git status --short
git log -3 --oneline
```

Expected: no whitespace errors; only pre-existing user-owned files may remain untracked or modified; the onboarding changes are committed in the two task commits.

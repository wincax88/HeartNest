# HeartNest Cross-Platform Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the six-screen HeartNest experience from the `docs` references as one uni-app application for H5, WeChat Mini Program, and App, then deploy the verified H5 build to the supplied Sealos cluster.

**Architecture:** Keep the cross-platform app under `app/`. Vue pages consume typed Pinia stores and deterministic mock services; platform-specific behavior is limited to safe-area helpers and build configuration. H5 is served by stock nginx from a namespace PVC so deployment does not require a private container registry.

**Tech Stack:** uni-app, Vue 3, TypeScript, Vite, Pinia, Vitest, Vue Test Utils, Sass, Playwright, nginx, Kubernetes.

---

## File map

- `app/src/pages/`: onboarding, home, companion, chat, review, profile, settings, membership pages.
- `app/src/components/`: reusable glass cards, app header, bottom navigation, mood selector, companion cards, chat bubbles, trend chart, settings rows.
- `app/src/domain/`: business types and deterministic reply policy.
- `app/src/mocks/`: companions, moods, review history, memories, profile, memberships.
- `app/src/stores/`: app, chat, review, profile stores and persistence adapter.
- `app/src/styles/`: design tokens, typography, safe-area and shared layout rules.
- `app/src/static/heartnest/`: generated character, night-scene and fallback assets.
- `app/tests/`: unit and component tests.
- `app/e2e/`: H5 primary-flow tests.
- `deploy/`: nginx image recipe, namespace-scoped Kubernetes resources, upload script and verification script.
- `docs/assets/heartnest/`: asset catalog and generation notes.

### Task 1: Create the uni-app workspace and test harness

**Files:**
- Create: `app/` from the official `dcloudio/uni-preset-vue#vite-ts` template
- Modify: `app/package.json`
- Modify: `app/vite.config.ts`
- Create: `app/vitest.config.ts`
- Create: `app/tests/setup.ts`
- Create: `app/tests/smoke/app-shell.spec.ts`

- [ ] **Step 1: Scaffold the official TypeScript template**

Run:

```powershell
npx degit dcloudio/uni-preset-vue#vite-ts app
Set-Location app
npm install
npm install pinia sass @dcloudio/uni-ui
npm install -D vitest @vue/test-utils happy-dom @playwright/test
```

Expected: `app/src/App.vue`, `app/src/main.ts`, `app/src/pages.json`, and platform build scripts exist.

- [ ] **Step 2: Add deterministic scripts to `app/package.json`**

Ensure these scripts exist:

```json
{
  "scripts": {
    "dev:h5": "uni",
    "build:h5": "uni build",
    "build:mp-weixin": "uni build -p mp-weixin",
    "build:app": "uni build -p app",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 3: Write the failing app-shell smoke test**

```ts
import { describe, expect, it } from 'vitest'
import pages from '../../src/pages.json'

describe('app shell', () => {
  it('declares every required screen', () => {
    const paths = pages.pages.map((page) => page.path)
    expect(paths).toEqual(expect.arrayContaining([
      'pages/onboarding/index', 'pages/home/index',
      'pages/companion/index', 'pages/chat/index',
      'pages/review/index', 'pages/profile/index',
      'pages/settings/index', 'pages/membership/index',
    ]))
  })
})
```

- [ ] **Step 4: Run the test and verify RED**

Run: `npm test -- tests/smoke/app-shell.spec.ts`

Expected: FAIL because the required pages are not declared.

- [ ] **Step 5: Add minimal route components and test configuration**

Configure Vitest for `happy-dom`, `@` alias, globals, and `tests/setup.ts`. Add all routes to `pages.json` with custom navigation disabled so each screen owns its header.

- [ ] **Step 6: Run the test and verify GREEN**

Run: `npm test -- tests/smoke/app-shell.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add app
git commit -m "build: scaffold HeartNest uni-app workspace"
```

### Task 2: Define domain models and deterministic mock content

**Files:**
- Create: `app/src/domain/models.ts`
- Create: `app/src/domain/reply-policy.ts`
- Create: `app/src/mocks/companions.ts`
- Create: `app/src/mocks/moods.ts`
- Create: `app/src/mocks/reviews.ts`
- Create: `app/src/mocks/profile.ts`
- Test: `app/tests/domain/reply-policy.spec.ts`

- [ ] **Step 1: Write failing reply-policy tests**

```ts
import { describe, expect, it } from 'vitest'
import { chooseReply } from '@/domain/reply-policy'

describe('chooseReply', () => {
  it('mirrors tired feelings for Mika', () => {
    expect(chooseReply({ companionId: 'mika', moodId: 'tired', text: '今天很累' }))
      .toContain('撑了很久')
  })

  it('uses Aiden analysis language', () => {
    expect(chooseReply({ companionId: 'aiden', moodId: 'anxious', text: '事情很多' }))
      .toContain('一起理清')
  })
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/domain/reply-policy.spec.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the models and pure reply policy**

Define `Companion`, `MoodOption`, `MoodRecord`, `ChatThread`, `ChatMessage`, `MemoryItem`, `ReviewDay`, `UserProfile`, `Membership`, and `AppPreferences`. Implement `chooseReply(input)` as a pure lookup with stable keyword branches and a companion-specific fallback.

- [ ] **Step 4: Add complete mock fixtures**

Create Mika, Luna and Aiden fixtures matching the reference copy; four moods; seven review days; three memories; Michael's profile; free and Pro membership fixtures.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test -- tests/domain/reply-policy.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/src/domain app/src/mocks app/tests/domain
git commit -m "feat: add HeartNest mock domain"
```

### Task 3: Add persistence and Pinia stores

**Files:**
- Create: `app/src/stores/persistence.ts`
- Create: `app/src/stores/app.ts`
- Create: `app/src/stores/chat.ts`
- Create: `app/src/stores/review.ts`
- Create: `app/src/stores/profile.ts`
- Modify: `app/src/main.ts`
- Test: `app/tests/stores/chat.spec.ts`
- Test: `app/tests/stores/persistence.spec.ts`

- [ ] **Step 1: Write failing store tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { defaultPersistedState, readPersistedState } from '@/stores/persistence'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})

it('adds one user message and one deterministic reply', async () => {
  const store = useChatStore()
  const sending = store.send('今天有点累')
  await vi.runAllTimersAsync()
  await sending
  expect(store.messages.map((message) => message.sender)).toEqual(['user', 'companion'])
})

it('falls back when persisted state has the wrong version', () => {
  expect(readPersistedState({ version: 0, data: {} })).toEqual(defaultPersistedState())
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/stores`

Expected: FAIL because stores and persistence do not exist.

- [ ] **Step 3: Implement storage boundaries**

Wrap `uni.getStorageSync` and `uni.setStorageSync` behind `PersistencePort`. Store `{ version: 1, data }`; catch storage failures and keep the in-memory state usable.

- [ ] **Step 4: Implement stores**

`appStore` owns onboarding, selected mood and companion. `chatStore` owns threads, sending state, failure/retry and memories. `reviewStore` merges fixed history with local mood records. `profileStore` owns profile, membership and preferences.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test -- tests/stores`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/src/stores app/src/main.ts app/tests/stores
git commit -m "feat: add persisted HeartNest state"
```

### Task 4: Produce and catalog visual assets

**Files:**
- Create: `docs/assets/heartnest/asset-catalog.md`
- Create: `app/src/static/heartnest/onboarding-night.webp`
- Create: `app/src/static/heartnest/home-night.webp`
- Create: `app/src/static/heartnest/chat-night.webp`
- Create: `app/src/static/heartnest/mika-card.webp`
- Create: `app/src/static/heartnest/luna-card.webp`
- Create: `app/src/static/heartnest/aiden-card.webp`
- Create: `app/src/static/heartnest/mika-profile.webp`
- Create: `app/src/static/heartnest/avatar-*.webp`
- Create: `app/src/static/heartnest/fallback-night.webp`

- [ ] **Step 1: Record measured asset slots**

Document source reference, subject, crop, output dimensions, focal point and consuming component. Use 2x mobile density: hero `786×760`, cards `480×560`, profile `786×700`, avatars `192×192`, background `786×1704`.

- [ ] **Step 2: Generate individual assets from the supplied references**

Use ImageGen for original, stylistically matched night scenes and Mika/Luna/Aiden portraits. Do not include UI text, status bars, buttons or device chrome in generated assets.

- [ ] **Step 3: Inspect every generated asset**

Check subject, crop, color, sharpness and consistency. Regenerate assets with text artifacts, malformed hands/faces, mismatched lighting or unusable crops.

- [ ] **Step 4: Convert and optimize**

Save WebP assets at the cataloged dimensions. Keep each mobile image reasonably compressed while preserving facial detail.

- [ ] **Step 5: Commit**

```powershell
git add docs/assets/heartnest app/src/static/heartnest
git commit -m "feat: add HeartNest visual assets"
```

### Task 5: Build design tokens and shared components

**Files:**
- Create: `app/src/styles/tokens.scss`
- Create: `app/src/styles/global.scss`
- Modify: `app/src/App.vue`
- Create: `app/src/components/HnGlassCard.vue`
- Create: `app/src/components/HnBottomNav.vue`
- Create: `app/src/components/HnPrimaryButton.vue`
- Create: `app/src/components/HnAppHeader.vue`
- Test: `app/tests/components/bottom-nav.spec.ts`

- [ ] **Step 1: Write the failing navigation test**

```ts
it('emits the selected destination', async () => {
  const wrapper = mount(HnBottomNav, { props: { active: 'home' } })
  await wrapper.get('[data-testid="nav-review"]').trigger('click')
  expect(wrapper.emitted('navigate')?.[0]).toEqual(['review'])
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/components/bottom-nav.spec.ts`

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement tokens and shared components**

Define midnight background, glass surfaces, white/blue-gray text, purple/pink/warm-orange accents, radii, spacing and safe-area tokens. Use uni-ui icons or another installed cross-platform icon library; do not draw standard icons with CSS or text glyphs.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- tests/components/bottom-nav.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/src/styles app/src/components app/src/App.vue app/tests/components
git commit -m "feat: add HeartNest design system"
```

### Task 6: Implement onboarding and home

**Files:**
- Create: `app/src/pages/onboarding/index.vue`
- Create: `app/src/pages/home/index.vue`
- Create: `app/src/components/MoodSelector.vue`
- Create: `app/src/components/CompanionCard.vue`
- Test: `app/tests/pages/home.spec.ts`

- [ ] **Step 1: Write failing home-flow tests**

Test that choosing `tired` applies selected state, clicking Mika navigates to `/pages/companion/index?id=mika`, and the main CTA navigates to Mika chat when no other companion is selected.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- tests/pages/home.spec.ts`

Expected: FAIL because the pages and controls do not exist.

- [ ] **Step 3: Implement onboarding**

Build the three-slide night-scene experience, indicators, “开始体验” and “我先看看”. Persist completion and route to home.

- [ ] **Step 4: Implement home**

Match the first reference: greeting, mood glass panel, three character cards, nightly insight, gradient primary CTA and four-item bottom navigation. Implement selected, pressed and disabled states.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test -- tests/pages/home.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/src/pages/onboarding app/src/pages/home app/src/components app/tests/pages/home.spec.ts
git commit -m "feat: implement onboarding and home"
```

### Task 7: Implement companion profile and chat

**Files:**
- Create: `app/src/pages/companion/index.vue`
- Create: `app/src/pages/chat/index.vue`
- Create: `app/src/components/ChatBubble.vue`
- Create: `app/src/components/MemoryPrompt.vue`
- Test: `app/tests/pages/chat.spec.ts`

- [ ] **Step 1: Write failing chat tests**

Test invalid companion fallback, blank-input rejection, user-message rendering, replying state, deterministic companion reply, duplicate-send protection, failed-message retry and memory removal.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/pages/chat.spec.ts`

Expected: FAIL because pages are missing.

- [ ] **Step 3: Implement companion profile**

Render the selected character hero, role, description, traits, response style, preferred hours, memory count, quote and chat CTA using the third reference.

- [ ] **Step 4: Implement chat**

Match the fourth reference. Keep the input above the keyboard/safe area, scroll to the newest message, expose retry and memory actions, and prevent repeated sends while a reply is pending.

- [ ] **Step 5: Run and verify GREEN**

Run: `npm test -- tests/pages/chat.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/src/pages/companion app/src/pages/chat app/src/components app/tests/pages/chat.spec.ts
git commit -m "feat: implement companion and chat flows"
```

### Task 8: Implement review, profile, settings and membership

**Files:**
- Create: `app/src/pages/review/index.vue`
- Create: `app/src/components/MoodTrendChart.vue`
- Create: `app/src/pages/profile/index.vue`
- Create: `app/src/pages/settings/index.vue`
- Create: `app/src/pages/membership/index.vue`
- Test: `app/tests/pages/review-profile.spec.ts`

- [ ] **Step 1: Write failing review/profile tests**

Test seven-day point rendering, empty review state, timeline selection, preference persistence, local membership upgrade and navigation back to profile.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/pages/review-profile.spec.ts`

Expected: FAIL because the pages are missing.

- [ ] **Step 3: Implement review**

Match the fifth reference with an accessible Canvas-based trend chart, keyword cards, timeline and saved fragments. Provide textual values in addition to the chart.

- [ ] **Step 4: Implement profile and settings**

Match the sixth reference. Make notification, privacy/data and companion preference rows open functional local settings. Use `uni.chooseImage` only for local avatar preview.

- [ ] **Step 5: Implement membership demo**

Show Pro benefits and a clearly labeled simulated confirmation. Do not call payment APIs.

- [ ] **Step 6: Run and verify GREEN**

Run: `npm test -- tests/pages/review-profile.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add app/src/pages/review app/src/pages/profile app/src/pages/settings app/src/pages/membership app/src/components app/tests/pages/review-profile.spec.ts
git commit -m "feat: implement review and profile flows"
```

### Task 9: Verify all platform builds and primary H5 flow

**Files:**
- Create: `app/playwright.config.ts`
- Create: `app/e2e/primary-flow.spec.ts`
- Create: `app/README.md`

- [ ] **Step 1: Write the H5 primary-flow test**

The test must complete onboarding, choose “有点累”, open Mika, send “今天脑子停不下来”, observe a Mika reply, open 回顾, open 我的, change a preference, reload and confirm persistence.

- [ ] **Step 2: Run it and verify RED before the preview is started**

Run: `npm run test:e2e`

Expected: FAIL because no H5 server is available.

- [ ] **Step 3: Run all unit tests and builds**

```powershell
npm test
npm run build:h5
npm run build:mp-weixin
npm run build:app
```

Expected: tests pass; H5 output exists under `dist/build/h5`; WeChat output exists under `dist/build/mp-weixin`; App resources compile successfully.

- [ ] **Step 4: Start H5 and run E2E**

Run the H5 dev server on a fixed local port, then run `npm run test:e2e`.

Expected: PASS with no browser console errors.

- [ ] **Step 5: Document platform workflows**

Document Node requirements, H5 commands, importing `dist/build/mp-weixin` into WeChat Developer Tools, and opening App output with HBuilderX/cloud packaging.

- [ ] **Step 6: Commit**

```powershell
git add app/playwright.config.ts app/e2e app/README.md
git commit -m "test: verify HeartNest cross-platform flow"
```

### Task 10: Run iterative visual QA

**Files:**
- Create: `design-qa.md`
- Create: `artifacts/qa/*.png`
- Modify: any app UI files required by findings

- [ ] **Step 1: Capture each source and matching implementation state**

Use the same mobile viewport and compare onboarding, home, companion, chat, review and profile. Save implementation captures under `artifacts/qa/`.

- [ ] **Step 2: Create the first QA report**

Record source path, capture path, viewport, density, fonts, spacing, colors, image fidelity, copy, interactions and prioritized findings. Set `final result: blocked` while P0/P1/P2 findings exist.

- [ ] **Step 3: Fix P0/P1/P2 findings**

Adjust assets, crop, layout, text scale, spacing, contrast and states without redesigning the references.

- [ ] **Step 4: Recapture and compare**

Add the iteration history and repeat until no actionable P0/P1/P2 issue remains.

- [ ] **Step 5: Mark the report passed and commit**

```powershell
git add design-qa.md artifacts/qa app/src
git commit -m "fix: align HeartNest screens with references"
```

Expected: `design-qa.md` ends with `final result: passed`.

### Task 11: Add namespace-safe Sealos deployment

**Files:**
- Create: `deploy/Dockerfile`
- Create: `deploy/nginx.conf`
- Create: `deploy/pvc.yaml`
- Create: `deploy/workload.yaml`
- Create: `deploy/uploader.yaml`
- Create: `deploy/publish.ps1`
- Create: `deploy/verify.ps1`
- Create: `deploy/README.md`

- [ ] **Step 1: Write the failing manifest checks**

Add a script assertion that all resources are named `heartnest-web`, target namespace `ns-i61rahoe`, use HTTP probes, define CPU/memory requests and limits, and never contain kubeconfig data.

- [ ] **Step 2: Run the check and verify RED**

Run: `pwsh deploy/verify.ps1 -StaticOnly`

Expected: FAIL because manifests do not exist.

- [ ] **Step 3: Create static hosting resources**

Use `nginx:1.27-alpine`, a `1Gi` PVC named `heartnest-web`, `ClusterIP` Service on port 80, readiness/liveness `GET /`, and an Ingress host `heartnest-ns-i61rahoe.gzg.sealos.run`. Configure nginx `try_files $uri $uri/ /index.html` for SPA fallback.

Keep a registry-ready image recipe even though the first Sealos publish uses the PVC path:

```dockerfile
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY app/dist/build/h5/ /usr/share/nginx/html/
EXPOSE 80
```

The nginx server block must listen on port 80, serve `/usr/share/nginx/html`, cache hashed static assets, and fall back to `/index.html` for application routes.

- [ ] **Step 4: Create the publishing script**

`publish.ps1` must:

1. run `npm run build:h5` in `app`;
2. apply `deploy/pvc.yaml`;
3. create the namespace-scoped temporary uploader Pod from `deploy/uploader.yaml`;
4. wait for Ready;
5. copy `app/dist/build/h5/.` into `/site` on the PVC;
6. delete only the temporary `heartnest-uploader` Pod;
7. apply `deploy/workload.yaml`;
8. wait for `deployment/heartnest-web` rollout;
9. print the public HeartNest hostname.

Every kubectl call must use the explicit kubeconfig path supplied at invocation and `-n ns-i61rahoe`.

- [ ] **Step 5: Run static checks and verify GREEN**

Run: `pwsh deploy/verify.ps1 -StaticOnly`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add deploy
git commit -m "ops: add Sealos H5 deployment"
```

### Task 12: Deploy and verify the public experience

**Files:**
- Modify: `deploy/README.md` with observed deployment details

- [ ] **Step 1: Confirm the target namespace without exposing credentials**

Run:

```powershell
kubectl --kubeconfig 'C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml' config view --minify -o jsonpath='{..namespace}'
```

Expected: `ns-i61rahoe`.

- [ ] **Step 2: Publish the verified H5 build**

Run:

```powershell
pwsh deploy/publish.ps1 -Kubeconfig 'C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml'
```

Expected: PVC upload succeeds and `deployment/heartnest-web` completes rollout.

- [ ] **Step 3: Verify Kubernetes state**

```powershell
kubectl --kubeconfig 'C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml' -n ns-i61rahoe get deploy,po,svc,ingress,pvc
```

Expected: deployment available, pod Ready, service/endpoints present, ingress assigned, PVC Bound.

- [ ] **Step 4: Verify the public browser flow**

Open `https://heartnest-ns-i61rahoe.gzg.sealos.run/`, verify HTTPS, complete the primary flow, and check the browser console.

- [ ] **Step 5: Record observed URL and deployment notes**

Update `deploy/README.md` with the actual public URL, resource names, publish command and rollback procedure. Do not include tokens or kubeconfig content.

- [ ] **Step 6: Run final verification**

```powershell
Set-Location app
npm test
npm run build:h5
npm run build:mp-weixin
npm run build:app
npm run test:e2e
```

Expected: all tests and builds pass; deployed primary flow works; `design-qa.md` says `final result: passed`.

- [ ] **Step 7: Commit**

```powershell
git add deploy/README.md
git commit -m "docs: record HeartNest deployment"
```

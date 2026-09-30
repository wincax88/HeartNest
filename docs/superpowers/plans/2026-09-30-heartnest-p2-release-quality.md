# HeartNest P2 Release Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three clients accessible and state-complete, then replace the single-instance PVC release with observable, recoverable, rolling production deployment.

**Architecture:** Introduce small shared UI primitives for semantic actions and asynchronous states while preserving the current visual system. Package the H5/API server as an immutable image, run two stateless API replicas against PostgreSQL, and move migration, backup, restore verification and smoke checks into explicit jobs.

**Tech Stack:** Vue 3, uni-app, inline SVG components, Vitest, Playwright plus axe-core, Docker, GitHub Actions, Kubernetes/Sealos, PostgreSQL.

---

## File structure

- `app/src/components/icons/*.vue`: code-owned SVG icons.
- `app/src/components/HnAsyncState.vue`: loading, error, offline and empty state primitive.
- `app/src/components/HnAction.vue`: semantic cross-platform action primitive.
- `app/src/composables/useNetworkState.ts`: online/offline state.
- `app/tests/accessibility/*.spec.ts`: semantic and reduced-motion checks.
- `deploy/app.yaml`: immutable image Deployment/Service/Ingress.
- `deploy/backup-cronjob.yaml`, `deploy/restore-check-cronjob.yaml`: data recovery jobs.
- `app/server/observability.mjs`: request IDs, structured logs and metrics.

### Task 1: Replace glyph icons with SVG components

**Files:**
- Create: `app/src/components/HnIcon.vue`
- Create: `app/src/components/icons/paths.ts`
- Create: `app/tests/components/icon.spec.ts`
- Modify: `app/package.json`
- Modify: `app/src/components/uni-icons/uni-icons.vue`

- [ ] **Step 1: Write the failing icon semantics test**

```ts
it('renders functional icons with a name and decorative icons hidden', () => {
  const functional = mount(HnIcon, { props: { name: 'settings', label: '设置' } })
  expect(functional.get('svg').attributes('aria-label')).toBe('设置')
  const decorative = mount(HnIcon, { props: { name: 'heart', decorative: true } })
  expect(decorative.get('svg').attributes('aria-hidden')).toBe('true')
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/components/icon.spec.ts`

Expected: FAIL because `HnIcon` does not exist.

- [ ] **Step 3: Implement an SVG path registry**

Render a fixed `viewBox="0 0 24 24"` SVG from code-owned paths for every existing icon type. Keep `uni-icons.vue` as a compatibility wrapper during migration, but remove all character glyphs and the Georgia font dependency. Add `test:visual` as `node tests/e2e/visual-smoke.mjs`.

- [ ] **Step 4: Verify GREEN and visual smoke**

Run: `npm test -- tests/components/icon.spec.ts && npm run build:h5 && npm run test:visual`

Expected: tests/build pass and visual snapshots show no missing icons.

- [ ] **Step 5: Commit**

```bash
git add app/src/components app/tests/components/icon.spec.ts
git commit -m "feat: replace text glyphs with accessible SVG icons"
```

### Task 2: Semantic navigation, actions and mood selection

**Files:**
- Create: `app/src/components/HnAction.vue`
- Create: `app/tests/accessibility/semantics.spec.ts`
- Modify: `app/src/components/HnBottomNav.vue`
- Modify: `app/src/components/MoodSelector.vue`
- Modify: `app/src/components/CompanionCard.vue`
- Modify: `app/src/components/HnPrimaryButton.vue`
- Modify: `app/src/pages/profile/index.vue`

- [ ] **Step 1: Write failing semantic tests**

```ts
it('exposes bottom navigation as tabs with one selected item', () => {
  const wrapper = mount(HnBottomNav, { props: { active: 'home' } })
  expect(wrapper.get('[role="tablist"]').exists()).toBe(true)
  expect(wrapper.findAll('[role="tab"]').filter(node => node.attributes('aria-selected') === 'true')).toHaveLength(1)
})

it('exposes moods as a labeled single-select group', () => {
  const wrapper = mount(MoodSelector, { props: { items: moods, modelValue: 'calm' } })
  expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('此刻心情')
  expect(wrapper.get('[aria-checked="true"]').text()).toContain('平静')
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/accessibility/semantics.spec.ts`

Expected: FAIL because current `view` elements do not expose the required semantics.

- [ ] **Step 3: Implement semantic cross-platform actions**

Use native `button` where uni-app supports it and explicit `role`, `aria-selected`, `aria-checked`, keyboard Enter/Space handlers and disabled state elsewhere. Ensure each target has a 44px minimum hit area and visible focus ring.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/accessibility/semantics.spec.ts tests/components/bottom-nav.spec.ts && npm run type-check`

Expected: PASS without regressing existing navigation events.

- [ ] **Step 5: Commit**

```bash
git add app/src/components app/src/pages/profile/index.vue app/tests/accessibility/semantics.spec.ts
git commit -m "feat: add semantic navigation and controls"
```

### Task 3: Unified loading, error, offline and empty states

**Files:**
- Create: `app/src/components/HnAsyncState.vue`
- Create: `app/src/composables/useNetworkState.ts`
- Create: `app/tests/components/async-state.spec.ts`
- Modify: `app/src/pages/home/index.vue`
- Modify: `app/src/pages/chat/index.vue`
- Modify: `app/src/pages/review/index.vue`
- Modify: `app/src/pages/profile/index.vue`

- [ ] **Step 1: Write failing state tests**

```ts
it.each(['loading', 'error', 'offline', 'empty'])('announces %s state', (state) => {
  const wrapper = mount(HnAsyncState, { props: { state, title: '状态标题', actionLabel: '重试' } })
  expect(wrapper.get('[role="status"]').text()).toContain('状态标题')
})

it('makes the review empty-state action navigate home', async () => {
  await wrapper.get('[data-testid="review-empty-action"]').trigger('click')
  expect(reLaunch).toHaveBeenCalledWith({ url: '/pages/home/index' })
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/components/async-state.spec.ts tests/pages/review-profile.spec.ts`

Expected: FAIL because the shared state component and empty action are absent.

- [ ] **Step 3: Implement state components and page integration**

Show a skeleton plus status text while loading, preserve cached history read-only while offline, expose a single retry action for recoverable errors, and give every empty state one next step. Chat must never render an unexplained blank shell.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/components/async-state.spec.ts tests/pages/home.spec.ts tests/pages/chat.spec.ts tests/pages/review-profile.spec.ts`

Expected: PASS for every state transition.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/HnAsyncState.vue app/src/composables app/src/pages app/tests/components/async-state.spec.ts
git commit -m "feat: unify loading error offline and empty states"
```

### Task 4: Accessible charts, focus and reduced motion

**Files:**
- Create: `app/tests/accessibility/review.spec.ts`
- Create: `app/tests/e2e/accessibility.mjs`
- Modify: `app/package.json`
- Modify: `app/src/pages/review/index.vue`
- Modify: `app/src/styles/global.scss`
- Modify: `app/src/styles/tokens.scss`

- [ ] **Step 1: Write failing chart and motion tests**

```ts
it('provides a text summary and one data row per review day', () => {
  const wrapper = mount(ReviewPage)
  expect(wrapper.get('[data-testid="review-summary"]').text()).toContain('近 7 天')
  expect(wrapper.findAll('[data-testid="review-data-row"]')).toHaveLength(7)
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/accessibility/review.spec.ts`

Expected: FAIL because text equivalents are missing.

- [ ] **Step 3: Add text equivalents and global accessibility CSS**

Render a concise trend sentence and semantic day list beside the visual chart. Add `:focus-visible` tokens with at least 3:1 focus contrast and `@media (prefers-reduced-motion: reduce)` rules that remove non-essential transition and animation. Add `@axe-core/playwright` and the `test:a11y` script `node tests/e2e/accessibility.mjs`; the script checks onboarding, home, chat, review and profile against serious/critical violations.

- [ ] **Step 4: Verify GREEN plus automated H5 audit**

Run: `npm test -- tests/accessibility/review.spec.ts && npm run test:a11y`

Expected: PASS with no serious axe violations on onboarding, home, chat, review and profile.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/review/index.vue app/src/styles app/tests/accessibility/review.spec.ts
git commit -m "feat: add accessible review data and motion preferences"
```

### Task 5: Production manifest and least-privilege platform configuration

**Files:**
- Modify: `app/src/manifest.json`
- Modify: `app/.env.example`
- Create: `app/tests/smoke/manifest.spec.ts`
- Modify: `app/README.md`

- [ ] **Step 1: Write failing manifest tests**

```ts
it('does not request unused Android sensitive permissions', () => {
  const permissions = manifest['app-plus'].distribute.android.permissions.join('\n')
  for (const forbidden of ['READ_LOGS', 'GET_ACCOUNTS', 'READ_PHONE_STATE', 'WRITE_SETTINGS', 'CAMERA']) {
    expect(permissions).not.toContain(forbidden)
  }
})

it('enables WeChat URL validation for release builds', () => {
  expect(manifest['mp-weixin'].setting.urlCheck).toBe(true)
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/smoke/manifest.spec.ts`

Expected: FAIL because current permissions are broad and `urlCheck` is false.

- [ ] **Step 3: Minimize permissions and externalize App IDs**

Remove unused sensitive permissions. Configure App/WeChat IDs through documented release-time environment substitution; release builds fail if the selected platform App ID is empty. Keep local development able to build with an explicit development manifest transform.

- [ ] **Step 4: Verify GREEN and platform builds**

Run: `npm test -- tests/smoke/manifest.spec.ts && npm run build:mp-weixin && npm run build:app`

Expected: tests and builds pass with test release identifiers; no unused permission appears in generated manifests.

- [ ] **Step 5: Commit**

```bash
git add app/src/manifest.json app/.env.example app/tests/smoke/manifest.spec.ts app/README.md
git commit -m "chore: harden cross-platform release manifests"
```

### Task 6: Immutable rolling application deployment

**Files:**
- Modify: `deploy/Dockerfile`
- Create: `deploy/app.yaml`
- Modify: `.github/workflows/deploy-sealos.yml`
- Modify: `deploy/verify.ps1`
- Remove: `deploy/workload.yaml`
- Remove: `deploy/publish.ps1`
- Remove: `deploy/uploader.yaml`
- Remove: `deploy/actions-uploader.yaml`

- [ ] **Step 1: Extend deployment verification to fail on legacy flow**

`deploy/verify.ps1` must require `replicas: 2`, `RollingUpdate`, immutable image substitution, readiness/liveness probes, non-root security context and PodDisruptionBudget. It must fail if the workflow uploads releases to a PVC or references the legacy static manifests.

- [ ] **Step 2: Verify RED**

Run: `powershell -File deploy/verify.ps1`

Expected: FAIL on `Recreate`, one replica and PVC uploader references.

- [ ] **Step 3: Build and deploy an immutable image**

Use a pinned Node 20 base digest, copy the H5 build and production server dependencies into one image, publish it under the commit SHA, and deploy two replicas with maxUnavailable 0/maxSurge 1. The workflow applies migrations first, rolls out the image, checks business smoke endpoints, and automatically rolls back on failure.

- [ ] **Step 4: Verify image and server-side manifests**

Run: `docker build -f deploy/Dockerfile -t heartnest:test . && docker run --rm heartnest:test node --version && powershell -File deploy/verify.ps1 && kubectl --kubeconfig "C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml" apply --dry-run=server -f deploy/app.yaml`

Expected: image builds, runs as non-root, manifest checks pass and the API server accepts the resource.

- [ ] **Step 5: Commit**

```bash
git add deploy .github/workflows/deploy-sealos.yml
git commit -m "deploy: use immutable rolling HeartNest releases"
```

### Task 7: Backup, restore verification and observability

**Files:**
- Create: `app/server/observability.mjs`
- Create: `app/tests/server/observability.spec.mjs`
- Create: `deploy/backup-cronjob.yaml`
- Create: `deploy/restore-check-cronjob.yaml`
- Modify: `app/server/app.mjs`
- Modify: `deploy/app.yaml`
- Modify: `deploy/README.md`

- [ ] **Step 1: Write failing log-redaction tests**

```js
it('logs request metadata without tokens or message content', async () => {
  await request(app).post('/api/chats/mika/messages').set('Authorization', 'Bearer secret').send({ text: 'private words' })
  const output = sink.entries.join('\n')
  expect(output).toContain('requestId')
  expect(output).not.toContain('Bearer secret')
  expect(output).not.toContain('private words')
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/server/observability.spec.mjs`

Expected: FAIL because structured redacted logging is absent.

- [ ] **Step 3: Implement telemetry and recovery jobs**

Add request IDs, JSON logs, `/metrics`, latency/error/AI/payment/notification counters and no-body logging. Add an encrypted daily `pg_dump` CronJob with 30-day retention and a weekly restore-check CronJob that restores into an isolated temporary database, runs integrity queries, publishes status and drops the temporary database.

- [ ] **Step 4: Verify GREEN and dry-run jobs**

Run: `npm test -- tests/server/observability.spec.mjs && kubectl --kubeconfig "C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml" apply --dry-run=server -f deploy/backup-cronjob.yaml -f deploy/restore-check-cronjob.yaml`

Expected: log-redaction tests pass and Kubernetes accepts both jobs.

- [ ] **Step 5: Commit**

```bash
git add app/server/observability.mjs app/server/app.mjs app/tests/server/observability.spec.mjs deploy
git commit -m "ops: add redacted telemetry and verified backups"
```

### Task 8: Final cross-platform and production verification

**Files:**
- Create: `docs/release-checklist.md`
- Modify: `app/README.md`
- Modify: `deploy/README.md`

- [ ] **Step 1: Run the full clean suite**

Run: `npm ci && npm test && npm run test:integration && npm run test:e2e && npm run test:a11y && npm run type-check && npm run build:h5 && npm run build:mp-weixin && npm run build:app`

Expected: all commands exit 0 from a clean install.

- [ ] **Step 2: Run security and image checks**

Run: `npm audit --omit=dev --registry=https://registry.npmjs.org && npm audit --omit=dev --prefix server --registry=https://registry.npmjs.org && docker build -f ../deploy/Dockerfile -t heartnest:release-check .. && powershell -File ../deploy/verify.ps1`

Expected: no unaccepted high-severity production vulnerability; image and manifests pass.

- [ ] **Step 3: Execute the real-device checklist**

On WeChat DevTools and one Android/iOS device, verify login, consent, chat, crisis card, favorite, review, membership sandbox, reminders, keyboard focus, screen reader labels, 44px targets and reduced motion. Record exact platform/version and result; unavailable platform credentials remain explicitly blocked.

- [ ] **Step 4: Execute staged production rollout**

Deploy database/migrations, then image, then enable identity, then payment and notifications in separate workflow runs. Verify two available replicas, HTTPS redirect, business smoke endpoints, latest backup and latest restore-check result after each gate.

- [ ] **Step 5: Commit the release evidence**

```bash
git add docs/release-checklist.md app/README.md deploy/README.md
git commit -m "docs: record HeartNest production release verification"
```

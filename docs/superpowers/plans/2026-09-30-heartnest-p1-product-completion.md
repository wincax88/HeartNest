# HeartNest P1 Product Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn membership, payment, reminders, favorites, profile editing, review filtering, and retry behavior into real server-enforced product capabilities.

**Architecture:** Extend the authenticated PostgreSQL service from P0 with independent entitlement, payment, notification, and user-content modules. External platforms are accessed through explicit adapters; production never loads test adapters, and all callbacks are idempotent.

**Tech Stack:** Vue 3, uni-app, Pinia, Express, PostgreSQL, WeChat Pay API v3, WeChat subscription messages, App push adapter, Vitest, Playwright.

---

## File structure

- `app/server/entitlements.mjs`: server-owned plans, quotas and usage decisions.
- `app/server/payments/wechat.mjs`: WeChat Pay v3 signing, order and callback verification.
- `app/server/notifications/*.mjs`: reminder scheduler and platform adapters.
- `app/server/content.mjs`: favorites, profile and review queries.
- `app/src/stores/membership.ts`, `notifications.ts`, `favorites.ts`: client state boundaries.
- `app/src/pages/favorites/index.vue`, `profile-edit/index.vue`, `notification-settings/index.vue`: completed product pages.

### Task 1: Server-enforced entitlements and quotas

**Files:**
- Create: `app/server/entitlements.mjs`
- Create: `app/tests/server/entitlements.spec.mjs`
- Modify: `app/server/app.mjs`
- Create: `app/server/db/migrations/002_product_capabilities.sql`
- Modify: `app/server/db/repositories.mjs`

- [ ] **Step 1: Write a failing entitlement test**

```js
it('enforces the free daily chat quota on the server', async () => {
  const free = await authenticatedUser({ tier: 'free' })
  await free.consumeChatQuota(config.freeDailyChats)
  await expect(free.sendMessage('one more')).rejects.toMatchObject({ status: 429, code: 'DAILY_CHAT_QUOTA' })
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/server/entitlements.spec.mjs`

Expected: FAIL because no server entitlement decision exists.

- [ ] **Step 3: Implement plan configuration and atomic usage counters**

Expose `entitlementsFor(user, now)` and `consumeQuota(transaction, userId, capability, now)`. Create migration `002_product_capabilities.sql`. Store configurable guest/free/pro limits in a `plan_catalog` seed and daily usage in `usage_counters` with a unique `(user_id, capability, period_start)` constraint. Return remaining amount and reset time in API responses. Never modify the already-applied P0 migration.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:integration -- tests/server/entitlements.spec.mjs`

Expected: PASS, including two concurrent requests consuming only one final slot.

- [ ] **Step 5: Commit**

```bash
git add app/server app/tests/server/entitlements.spec.mjs
git commit -m "feat: enforce membership entitlements and quotas"
```

### Task 2: WeChat Pay order and callback lifecycle

**Files:**
- Create: `app/server/payments/wechat.mjs`
- Create: `app/server/payments/service.mjs`
- Create: `app/tests/server/payments.spec.mjs`
- Create: `app/server/db/migrations/003_payments.sql`
- Modify: `app/server/app.mjs`
- Modify: `app/server/db/repositories.mjs`

- [ ] **Step 1: Write failing payment contract tests**

```js
it('grants membership only after a verified callback', async () => {
  const order = await user.createOrder('heartnest-pro-monthly')
  expect((await user.profile()).membership.tier).toBe('free')
  await paymentAdapter.deliverVerifiedCallback(order.platformOrderId)
  expect((await user.profile()).membership.tier).toBe('pro')
})

it('treats a duplicate callback as idempotent', async () => {
  await paymentAdapter.deliverVerifiedCallback(order.platformOrderId)
  await paymentAdapter.deliverVerifiedCallback(order.platformOrderId)
  expect(await repositories.countMembershipGrants(order.id)).toBe(1)
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/server/payments.spec.mjs`

Expected: FAIL because payment services are absent.

- [ ] **Step 3: Implement WeChat Pay v3 adapter**

Create `003_payments.sql` for memberships, orders, grants and unique platform transaction IDs. Add authenticated `POST /api/payments/orders`, `GET /api/payments/orders/:id`, and public signed `POST /api/payments/wechat/callback`. Verify timestamp, nonce, signature and certificate serial before decrypting callback data. Complete the order and grant membership in one transaction. Return `PAYMENT_NOT_CONFIGURED` before creating an order when credentials are missing.

- [ ] **Step 4: Verify GREEN with fixed official-format fixtures**

Run: `npm test -- tests/server/payments.spec.mjs`

Expected: PASS for valid, duplicate, invalid-signature and amount-mismatch callbacks.

- [ ] **Step 5: Commit**

```bash
git add app/server/payments app/server/app.mjs app/server/db/repositories.mjs app/tests/server/payments.spec.mjs
git commit -m "feat: add verified WeChat membership payments"
```

### Task 3: Reminder schedules and platform notification adapters

**Files:**
- Create: `app/server/notifications/service.mjs`
- Create: `app/server/notifications/wechat.mjs`
- Create: `app/server/notifications/app-push.mjs`
- Create: `app/server/notifications/worker.mjs`
- Create: `app/tests/server/notifications.spec.mjs`
- Create: `app/server/db/migrations/004_notifications.sql`
- Modify: `app/server/app.mjs`

- [ ] **Step 1: Write failing timezone and quiet-hours tests**

```js
it('does not send inside the user quiet window', async () => {
  const schedule = reminder({ time: '22:30', timeZone: 'Asia/Shanghai', quietStart: '22:00', quietEnd: '08:00' })
  expect(nextDelivery(schedule, new Date('2026-09-30T14:25:00Z'))).toEqual(new Date('2026-10-01T00:30:00Z'))
})

it('records a dead letter after bounded retries', async () => {
  adapter.send.mockRejectedValue(new Error('upstream unavailable'))
  await worker.process(job)
  expect(await repositories.deadLetterFor(job.id)).toBeDefined()
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/server/notifications.spec.mjs`

Expected: FAIL because notification scheduling is absent.

- [ ] **Step 3: Implement schedules, authorization and bounded delivery**

Create `004_notifications.sql` for devices, template authorizations, schedules, jobs and dead letters. Add device/template authorization registration, reminder CRUD, due-job claiming with `FOR UPDATE SKIP LOCKED`, three bounded retries and dead-letter persistence. Disable the H5 notification switch when Web Push is unavailable. Test adapters are constructed only by tests.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:integration -- tests/server/notifications.spec.mjs`

Expected: PASS for timezone, quiet-hours, duplicate worker and revoked-token cases.

- [ ] **Step 5: Commit**

```bash
git add app/server/notifications app/server/app.mjs app/tests/server/notifications.spec.mjs
git commit -m "feat: deliver authorized cross-platform reminders"
```

### Task 4: Favorites, profile editing and review filters

**Files:**
- Create: `app/server/content.mjs`
- Create: `app/tests/server/content.spec.mjs`
- Create: `app/server/db/migrations/005_content.sql`
- Modify: `app/server/app.mjs`
- Modify: `app/server/db/repositories.mjs`
- Modify: `app/src/domain/models.ts`

- [ ] **Step 1: Write failing content tests**

```js
it('prevents duplicate favorites and hides another user records', async () => {
  const favorite = await alice.favoriteMessage(aliceMessage.id)
  expect((await alice.favoriteMessage(aliceMessage.id)).id).toBe(favorite.id)
  await expect(bob.favoriteMessage(aliceMessage.id)).rejects.toMatchObject({ status: 404 })
})

it('filters mood records by inclusive date range', async () => {
  expect(await alice.review({ from: '2026-09-01', to: '2026-09-30' })).toHaveLength(3)
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/server/content.spec.mjs`

Expected: FAIL because favorites and filtered review endpoints are absent.

- [ ] **Step 3: Implement authenticated CRUD**

Create `005_content.sql` for favorites and required review indexes. Add `PATCH /api/profile`, `GET/POST/DELETE /api/favorites`, and `GET /api/review?from=&to=&mood=`. Validate display name length, restrict avatar URLs to supported storage origins, enforce ownership in SQL, and use unique `(user_id, target_type, target_id)` favorites.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:integration -- tests/server/content.spec.mjs`

Expected: PASS for ownership, validation, idempotency and date boundary cases.

- [ ] **Step 5: Commit**

```bash
git add app/server/content.mjs app/server/app.mjs app/server/db app/src/domain/models.ts app/tests/server/content.spec.mjs
git commit -m "feat: add profile favorites and review queries"
```

### Task 5: Idempotent chat retry and message-level actions

**Files:**
- Modify: `app/src/stores/chat.ts`
- Modify: `app/src/components/ChatBubble.vue`
- Modify: `app/src/pages/chat/index.vue`
- Modify: `app/tests/stores/chat.spec.ts`
- Modify: `app/tests/pages/chat.spec.ts`

- [ ] **Step 1: Write the retry regression test**

```ts
it('retries a failed message with the original client id', async () => {
  const failed = { id: 'user-fixed', sender: 'user', content: '重试我', status: 'failed' } as ChatMessage
  store.messages = [failed]
  await store.retry(failed)
  expect(apiMock.sendMessage).toHaveBeenCalledWith('mika', expect.objectContaining({ clientMessageId: 'user-fixed' }))
  expect(store.messages.filter(message => message.id === 'user-fixed')).toHaveLength(1)
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/stores/chat.spec.ts`

Expected: FAIL because retry generates a new ID.

- [ ] **Step 3: Implement retry-in-place and favorite actions**

Change `send` to accept an optional existing message ID, update the failed item to `sending`, and reconcile the same record. Add a favorite toggle to sent bubbles and render structured quota/timeout errors without deleting the draft.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/stores/chat.spec.ts tests/pages/chat.spec.ts`

Expected: PASS with a single message record across fail/retry/success.

- [ ] **Step 5: Commit**

```bash
git add app/src/stores/chat.ts app/src/components/ChatBubble.vue app/src/pages/chat/index.vue app/tests/stores/chat.spec.ts app/tests/pages/chat.spec.ts
git commit -m "fix: make chat retry idempotent"
```

### Task 6: Complete membership, notification, favorites and profile UI

**Files:**
- Create: `app/src/stores/membership.ts`
- Create: `app/src/stores/notifications.ts`
- Create: `app/src/stores/favorites.ts`
- Create: `app/src/pages/favorites/index.vue`
- Create: `app/src/pages/profile-edit/index.vue`
- Create: `app/src/pages/notification-settings/index.vue`
- Create: `app/tests/pages/product-completion.spec.ts`
- Modify: `app/src/pages/membership/index.vue`
- Modify: `app/src/pages/profile/index.vue`
- Modify: `app/src/pages/review/index.vue`
- Modify: `app/src/pages/settings/index.vue`
- Modify: `app/src/pages.json`

- [ ] **Step 1: Write failing navigation and state tests**

```ts
it('opens a real favorites page from profile', async () => {
  await wrapper.get('[data-testid="menu-favorites"]').trigger('click')
  expect(navigateTo).toHaveBeenCalledWith({ url: '/pages/favorites/index' })
})

it('shows payment confirmation until the callback grants membership', async () => {
  await membershipStore.purchase('heartnest-pro-monthly')
  expect(membershipStore.order.status).toBe('confirming')
  expect(membershipStore.membership.tier).toBe('free')
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/pages/product-completion.spec.ts`

Expected: FAIL because pages and server-backed stores are missing.

- [ ] **Step 3: Implement pages and stores**

Render server-provided entitlements and payment status, platform authorization state, reminder schedule fields, favorite list, profile editing, review filters and chart summary. Remove the cosmetic local membership activation and the settings-only notification toggle.

- [ ] **Step 4: Verify GREEN and all platform builds**

Run: `npm test -- tests/pages/product-completion.spec.ts && npm run type-check && npm run build:h5 && npm run build:mp-weixin && npm run build:app`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/src app/tests/pages/product-completion.spec.ts
git commit -m "feat: complete membership reminders and saved content"
```

### Task 7: Stable isolated E2E and CI coverage

**Files:**
- Modify: `app/tests/e2e/flow-smoke.mjs`
- Create: `app/tests/e2e/test-adapters.mjs`
- Modify: `app/package.json`
- Modify: `.github/workflows/deploy-sealos.yml`

- [ ] **Step 1: Rewrite E2E assertions around behavior**

Create a random test identity per run, configure deterministic test adapters, and assert status/state rather than fixed AI prose. Add coverage for fail/retry, favorite persistence, payment callback simulation, reminder schedule and profile edit.

- [ ] **Step 2: Verify the old test fails against the isolated stack**

Run: `npm run test:e2e`

Expected: FAIL before the adapter and data-isolation setup is implemented.

- [ ] **Step 3: Implement isolated test bootstrapping**

Start the API with `NODE_ENV=test`, a dedicated PostgreSQL database and explicit test adapter factory. Add cleanup by test user ID. CI starts PostgreSQL as a service and runs unit, integration, E2E, H5, WeChat and App builds before deployment.

- [ ] **Step 4: Verify GREEN**

Run: `npm test && npm run test:integration && npm run test:e2e && npm run build:h5 && npm run build:mp-weixin && npm run build:app`

Expected: all commands exit 0 without using production credentials or shared online data.

- [ ] **Step 5: Commit**

```bash
git add app/tests/e2e app/package.json .github/workflows/deploy-sealos.yml
git commit -m "test: cover completed product flows end to end"
```

### Task 8: P1 verification checkpoint

**Files:**
- Modify: `app/README.md`

- [ ] **Step 1: Run full tests, builds and audit**

Run: `npm test && npm run test:integration && npm run test:e2e && npm run type-check && npm run build:h5 && npm run build:mp-weixin && npm run build:app && npm audit --omit=dev --registry=https://registry.npmjs.org`

Expected: all commands exit 0 and no unaccepted high-severity production vulnerability remains.

- [ ] **Step 2: Verify failure modes**

Run the contract suite for missing payment credentials, invalid callbacks, revoked notification authorization, quota exhaustion and duplicate chat retry.

Expected: each returns the documented structured error and preserves user data.

- [ ] **Step 3: Record real-platform sandbox gates**

Document WeChat Pay sandbox, subscription-message and App push checks as pending until credentials are installed; do not mark them complete based on test adapters.

- [ ] **Step 4: Review P1 requirement coverage**

Confirm server-enforced quotas, callback-only membership grants, reminder authorization, favorites, profile editing, review filtering, original-ID retry and isolated E2E.

- [ ] **Step 5: Commit**

```bash
git add app/README.md
git commit -m "docs: record P1 product verification"
```

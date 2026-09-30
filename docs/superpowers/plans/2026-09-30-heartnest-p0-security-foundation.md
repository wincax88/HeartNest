# HeartNest P0 Security Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace device-ID trust and JSON-only persistence with authenticated PostgreSQL storage, privacy controls, AI crisis safeguards, and secure production configuration.

**Architecture:** Keep the uni-app client and Express entry point, but split server responsibilities into configuration, database, identity, privacy, and safety modules injected into `createApi`. PostgreSQL becomes authoritative after an explicit JSON migration; test adapters replace external WeChat calls only when `NODE_ENV=test`.

**Tech Stack:** Vue 3, uni-app, Pinia, Express 4.22.3, PostgreSQL 16, `pg`, `jose`, `helmet`, `express-rate-limit`, Vitest, GitHub Actions, Kubernetes/Sealos.

---

## File structure

- `app/server/config.mjs`: validates required and optional environment configuration.
- `app/server/db/client.mjs`: PostgreSQL pool lifecycle and transactions.
- `app/server/db/migrate.mjs`: ordered SQL migration runner.
- `app/server/db/migrations/001_initial.sql`: P0 schema.
- `app/server/db/repositories.mjs`: user, session, consent, chat and audit persistence.
- `app/server/migrate-json.mjs`: repeatable JSON-to-PostgreSQL import and verification CLI.
- `app/server/auth/tokens.mjs`: access/refresh token creation, hashing and rotation.
- `app/server/auth/providers.mjs`: WeChat provider interface and production/test implementations.
- `app/server/auth/middleware.mjs`: bearer authentication and guest claim validation.
- `app/server/privacy.mjs`: consent, export and deletion state machine.
- `app/server/safety.mjs`: deterministic risk classification and output guard.
- `app/src/stores/auth.ts`: client session state and token refresh.
- `app/src/pages/consent/index.vue`, `app/src/pages/login/index.vue`, `app/src/pages/account/index.vue`: P0 user flows.
- `deploy/postgres.yaml`, `deploy/migrate-job.yaml`: dedicated database and schema job.

### Task 1: Secure configuration and dependency baseline

**Files:**
- Modify: `app/package.json`
- Modify: `app/server/package.json`
- Create: `app/server/config.mjs`
- Create: `app/tests/server/config.spec.mjs`
- Modify: `app/server/index.mjs`

- [ ] **Step 1: Write the failing configuration tests**

```js
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../server/config.mjs'

describe('loadConfig', () => {
  it('rejects production startup without database and token keys', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('DATABASE_URL')
  })

  it('keeps payment disabled when optional credentials are absent', () => {
    expect(loadConfig({ NODE_ENV: 'test', DATABASE_URL: 'postgres://test', TOKEN_SIGNING_KEY: 'x'.repeat(32), DATA_ENCRYPTION_KEY: 'y'.repeat(32) }).features.payment).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/server/config.spec.mjs`

Expected: FAIL because `server/config.mjs` does not exist.

- [ ] **Step 3: Add dependencies and minimal configuration loader**

Pin `express` to `4.22.3` in both package files. Add `pg`, `jose`, `helmet` and `express-rate-limit` to both production dependency sets. Implement:

```js
export function loadConfig(env = process.env) {
  const required = ['DATABASE_URL', 'TOKEN_SIGNING_KEY', 'DATA_ENCRYPTION_KEY']
  if (env.NODE_ENV === 'production') {
    for (const name of required) if (!env[name]) throw new Error(`Missing required configuration: ${name}`)
  }
  return {
    nodeEnv: env.NODE_ENV || 'development',
    databaseUrl: env.DATABASE_URL,
    tokenSigningKey: env.TOKEN_SIGNING_KEY,
    dataEncryptionKey: env.DATA_ENCRYPTION_KEY,
    features: {
      payment: Boolean(env.WECHAT_PAY_MCH_ID && env.WECHAT_PAY_PRIVATE_KEY),
      appPush: Boolean(env.APP_PUSH_ENDPOINT && env.APP_PUSH_KEY),
      phoneLogin: Boolean(env.SMS_ENDPOINT && env.SMS_API_KEY),
    },
  }
}
```

- [ ] **Step 4: Install and verify GREEN**

Run: `npm install && npm install --prefix server && npm test -- tests/server/config.spec.mjs && npm audit --omit=dev --registry=https://registry.npmjs.org`

Expected: configuration tests PASS and the API production dependency tree has no unaccepted high-severity Express-chain advisory.

- [ ] **Step 5: Commit**

```bash
git add app/package.json app/package-lock.json app/server/package.json app/server/package-lock.json app/server/config.mjs app/server/index.mjs app/tests/server/config.spec.mjs
git commit -m "chore: secure production configuration and dependencies"
```

### Task 2: PostgreSQL schema and repository boundary

**Files:**
- Create: `app/server/db/client.mjs`
- Create: `app/server/db/migrate.mjs`
- Create: `app/server/db/migrations/001_initial.sql`
- Create: `app/server/db/repositories.mjs`
- Create: `app/tests/server/postgres.spec.mjs`
- Create: `app/vitest.integration.config.ts`
- Modify: `app/package.json`
- Modify: `app/server/index.mjs`

- [ ] **Step 1: Write failing PostgreSQL integration tests**

```js
it('isolates records by authenticated user and enforces message idempotency', async () => {
  const alice = await repositories.createUser({ displayName: 'Alice' })
  const bob = await repositories.createUser({ displayName: 'Bob' })
  await repositories.insertMessage(alice.id, 'mika', { clientMessageId: 'same-id', content: 'A' })
  await repositories.insertMessage(bob.id, 'mika', { clientMessageId: 'same-id', content: 'B' })
  await expect(repositories.insertMessage(alice.id, 'mika', { clientMessageId: 'same-id', content: 'changed' })).rejects.toMatchObject({ code: 'MESSAGE_ID_CONFLICT' })
})
```

- [ ] **Step 2: Start a temporary PostgreSQL and verify RED**

Run: `docker run --name heartnest-test-postgres -e POSTGRES_PASSWORD=test -e POSTGRES_DB=heartnest_test -p 55432:5432 -d postgres:16-alpine` then `npm run test:integration -- tests/server/postgres.spec.mjs`

Expected: FAIL because migrations and repositories do not exist.

- [ ] **Step 3: Implement schema and repositories**

The initial migration must create `schema_migrations`, `users`, `user_identities`, `sessions`, `consents`, `guest_claims`, `mood_records`, `chat_threads`, `chat_messages`, `memories`, `audit_events`, `data_exports` and `deletion_tombstones`. Use UUID primary keys and this idempotency constraint:

```sql
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_thread_client_key UNIQUE (thread_id, client_message_id);
```

Expose transaction-scoped repository methods and map PostgreSQL uniqueness failures to domain errors without leaking SQL details. Add `test:integration` as `vitest run --config vitest.integration.config.ts`; the integration config includes `tests/server/**/*.spec.mjs`, uses a single worker, and requires `DATABASE_URL`.

- [ ] **Step 4: Verify migrations and isolation**

Run in PowerShell: `$env:DATABASE_URL='postgres://postgres:test@127.0.0.1:55432/heartnest_test'; npm run db:migrate; if ($LASTEXITCODE -eq 0) { npm run test:integration -- tests/server/postgres.spec.mjs }`

Expected: PASS; rerunning `db:migrate` reports zero pending migrations.

- [ ] **Step 5: Commit**

```bash
git add app/server/db app/server/index.mjs app/tests/server/postgres.spec.mjs app/vitest.integration.config.ts app/package.json
git commit -m "feat: add PostgreSQL persistence and migrations"
```

### Task 3: Repeatable JSON data migration

**Files:**
- Create: `app/server/migrate-json.mjs`
- Create: `app/tests/server/json-migration.spec.mjs`
- Modify: `app/package.json`
- Modify: `deploy/README.md`

- [ ] **Step 1: Write failing migration tests**

```js
it('imports each JSON user once and produces a matching summary', async () => {
  const first = await migrateJson({ filePath: fixturePath, repositories })
  const second = await migrateJson({ filePath: fixturePath, repositories })
  expect(first).toMatchObject({ users: 1, messages: 2, memories: 1 })
  expect(second).toMatchObject({ users: 0, skippedUsers: 1 })
})
```

- [ ] **Step 2: Verify RED**

Run: `npm run test:integration -- tests/server/json-migration.spec.mjs`

Expected: FAIL because `migrateJson` is missing.

- [ ] **Step 3: Implement import, verification and dry-run**

`migrate-json.mjs` must accept `--source`, `--dry-run` and `--verify-only`, hash the source device ID into `guest_claims`, import within one transaction per user, and print counts only. It must never print message content or credentials.

- [ ] **Step 4: Verify GREEN with dry-run and repeat import**

Run: `npm run test:integration -- tests/server/json-migration.spec.mjs && npm run migrate:json -- --source ./tests/fixtures/heartnest-v1.json --dry-run`

Expected: tests PASS; dry-run reports counts without database writes.

- [ ] **Step 5: Commit**

```bash
git add app/server/migrate-json.mjs app/tests/server/json-migration.spec.mjs app/package.json deploy/README.md
git commit -m "feat: migrate legacy HeartNest JSON data"
```

### Task 4: Auth providers, token rotation and route authorization

**Files:**
- Create: `app/server/auth/tokens.mjs`
- Create: `app/server/auth/providers.mjs`
- Create: `app/server/auth/middleware.mjs`
- Create: `app/tests/server/auth.spec.mjs`
- Modify: `app/server/app.mjs`

- [ ] **Step 1: Write failing auth tests**

```js
it('rotates refresh tokens and rejects replay', async () => {
  const login = await client.loginWithProvider('wechat_mini_program', 'valid-code')
  const rotated = await client.refresh(login.refreshToken)
  await expect(client.refresh(login.refreshToken)).rejects.toMatchObject({ status: 401, code: 'REFRESH_TOKEN_REUSED' })
  expect(rotated.refreshToken).not.toBe(login.refreshToken)
})

it('does not accept X-HeartNest-Device as authorization', async () => {
  await expect(client.bootstrap({ deviceId: 'device-known' })).rejects.toMatchObject({ status: 401 })
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/server/auth.spec.mjs`

Expected: FAIL because auth routes and token rotation are absent.

- [ ] **Step 3: Implement provider exchange and tokens**

Add `POST /api/auth/provider`, `POST /api/auth/refresh`, `POST /api/auth/logout`, and `POST /api/auth/logout-all`. Provider responses normalize to:

```js
{ provider: 'wechat_mini_program', subject: openid, unionId: unionid || null }
```

Use 15-minute signed access JWTs and opaque 30-day refresh tokens stored only as SHA-256 hashes. Protect all user data routes with bearer middleware. Permit test providers only when `nodeEnv === 'test'`.

- [ ] **Step 4: Verify GREEN and authorization matrix**

Run: `npm test -- tests/server/auth.spec.mjs tests/server/api.spec.mjs`

Expected: PASS; unauthenticated data routes return 401 and revoked tokens remain rejected.

- [ ] **Step 5: Commit**

```bash
git add app/server/auth app/server/app.mjs app/tests/server/auth.spec.mjs app/tests/server/api.spec.mjs
git commit -m "feat: add unified identity and rotating sessions"
```

### Task 5: Consent, export and account deletion

**Files:**
- Create: `app/server/privacy.mjs`
- Create: `app/tests/server/privacy.spec.mjs`
- Modify: `app/server/app.mjs`
- Modify: `app/server/db/repositories.mjs`

- [ ] **Step 1: Write failing privacy state tests**

```js
it('requires current consent before AI chat', async () => {
  const user = await authenticatedUser()
  await expect(user.sendMessage('hello')).rejects.toMatchObject({ status: 403, code: 'CONSENT_REQUIRED' })
  await user.acceptConsent({ privacyVersion: '2026-09-30', termsVersion: '2026-09-30', aiVersion: '2026-09-30' })
  await expect(user.sendMessage('hello')).resolves.toBeDefined()
})

it('allows cancellation during the seven-day deletion cooling period', async () => {
  await user.requestDeletion()
  await user.cancelDeletion()
  expect((await user.profile()).status).toBe('active')
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/server/privacy.spec.mjs`

Expected: FAIL because privacy routes are absent.

- [ ] **Step 3: Implement privacy endpoints**

Add `POST /api/privacy/consents`, `POST /api/privacy/exports`, `GET /api/privacy/exports/:id`, `POST /api/account/deletion`, and `DELETE /api/account/deletion`. Export payloads contain the authenticated user's records only and receive a one-use, short-lived download token. Deletion schedules `deleteAfter = now + 7 days`; a cleanup command physically deletes due users and writes a tombstone.

- [ ] **Step 4: Verify GREEN and cross-user denial**

Run: `npm test -- tests/server/privacy.spec.mjs`

Expected: PASS, including another user's export returning 404.

- [ ] **Step 5: Commit**

```bash
git add app/server/privacy.mjs app/server/app.mjs app/server/db/repositories.mjs app/tests/server/privacy.spec.mjs
git commit -m "feat: add consent and personal data controls"
```

### Task 6: Crisis safety pipeline, output guard and rate limits

**Files:**
- Create: `app/server/safety.mjs`
- Create: `app/tests/server/safety.spec.mjs`
- Modify: `app/server/ai.mjs`
- Modify: `app/server/app.mjs`

- [ ] **Step 1: Write failing safety tests**

```js
it.each([
  ['我现在就要伤害自己', 'imminent_self_harm'],
  ['我马上要伤害别人', 'imminent_harm_to_others'],
  ['最近很难受但现在安全', 'distress'],
  ['今天有点累', 'normal'],
])('classifies %s as %s', (text, expected) => expect(classifyRisk(text).level).toBe(expected))

it('does not call the model for imminent risk', async () => {
  await client.sendMessage('我现在就要伤害自己')
  expect(responder).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/server/safety.spec.mjs`

Expected: FAIL because the safety pipeline is absent.

- [ ] **Step 3: Implement deterministic guards**

Export `classifyRisk(text)`, `crisisResponse(level, locale)`, and `guardOutput(text)`. Imminent risks return a controlled response with emergency-service and trusted-person guidance. Output guard rejects diagnosis, coercive dependency language and dangerous instructions. Add per-user minute/day rate limiting and structured 429 metadata.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/server/safety.spec.mjs tests/server/deepseek.spec.mjs tests/server/api.spec.mjs`

Expected: PASS; imminent-risk tests prove the model adapter was not called.

- [ ] **Step 5: Commit**

```bash
git add app/server/safety.mjs app/server/ai.mjs app/server/app.mjs app/tests/server/safety.spec.mjs
git commit -m "feat: add crisis-safe conversation pipeline"
```

### Task 7: Client login, consent and account controls

**Files:**
- Create: `app/src/stores/auth.ts`
- Create: `app/src/pages/consent/index.vue`
- Create: `app/src/pages/login/index.vue`
- Create: `app/src/pages/account/index.vue`
- Create: `app/tests/pages/auth-privacy.spec.ts`
- Modify: `app/src/services/api.ts`
- Modify: `app/src/pages.json`
- Modify: `app/src/pages/onboarding/index.vue`
- Modify: `app/src/pages/settings/index.vue`

- [ ] **Step 1: Write failing page and store tests**

```ts
it('blocks continue until privacy, terms and AI consent are accepted', async () => {
  const wrapper = mount(ConsentPage)
  expect(wrapper.get('[data-testid="consent-continue"]').attributes('disabled')).toBeDefined()
  await wrapper.get('[data-testid="consent-all"]').trigger('click')
  expect(wrapper.get('[data-testid="consent-continue"]').attributes('disabled')).toBeUndefined()
})

it('refreshes once after an expired access token', async () => {
  apiMock.bootstrap.mockRejectedValueOnce(new ApiError(401, 'TOKEN_EXPIRED', 'expired'))
  await authStore.authorizedBootstrap()
  expect(apiMock.refreshSession).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/pages/auth-privacy.spec.ts`

Expected: FAIL because pages and auth store do not exist.

- [ ] **Step 3: Implement platform-aware login and privacy flows**

Store access tokens in memory and refresh credentials in the most secure storage available per platform. `api.ts` adds bearer headers, performs a single coordinated refresh, and never sends `X-HeartNest-Device` after migration. Add consent, login and account routes; settings links to export and deletion controls.

- [ ] **Step 4: Verify GREEN and platform builds**

Run: `npm test -- tests/pages/auth-privacy.spec.ts && npm run type-check && npm run build:h5 && npm run build:mp-weixin && npm run build:app`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/src app/tests/pages/auth-privacy.spec.ts
git commit -m "feat: add cross-platform login and privacy flows"
```

### Task 8: Dedicated PostgreSQL and secure rollout manifests

**Files:**
- Create: `deploy/postgres.yaml`
- Create: `deploy/migrate-job.yaml`
- Modify: `deploy/workload-actions.yaml`
- Modify: `.github/workflows/deploy-sealos.yml`
- Modify: `deploy/verify.ps1`
- Modify: `deploy/README.md`

- [ ] **Step 1: Add failing manifest assertions**

Extend `deploy/verify.ps1` to require a HeartNest-only PostgreSQL StatefulSet, `DATABASE_URL` secret reference, migration Job, HTTPS redirect, security headers, and the absence of `widget-demo-db` references.

- [ ] **Step 2: Verify RED**

Run: `powershell -File deploy/verify.ps1`

Expected: FAIL because PostgreSQL and migration resources are missing.

- [ ] **Step 3: Add manifests and staged workflow**

Create a PostgreSQL 16 StatefulSet/Service/PVC, least-privilege application Secret references, and a migration Job that runs before application rollout. Change Ingress to force HTTPS. The workflow must back up the JSON file, run `migrate:json --dry-run`, apply migrations, perform the real import during a maintenance gate, and retain rollback artifacts.

- [ ] **Step 4: Verify manifests without exposing secrets**

Run: `powershell -File deploy/verify.ps1 && kubectl --kubeconfig "C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml" apply --dry-run=server -f deploy/postgres.yaml -f deploy/migrate-job.yaml -f deploy/workload-actions.yaml`

Expected: verification passes and server-side dry-run accepts all resources. Do not run the real data migration in this task.

- [ ] **Step 5: Commit**

```bash
git add deploy .github/workflows/deploy-sealos.yml
git commit -m "deploy: prepare authenticated PostgreSQL rollout"
```

### Task 9: P0 verification checkpoint

**Files:**
- Modify: `app/README.md`
- Modify: `deploy/README.md`

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test && npm run test:integration && npm run type-check && npm run build:h5 && npm run build:mp-weixin && npm run build:app`

Expected: all unit, integration, type and build commands exit 0.

- [ ] **Step 2: Run security and manifest checks**

Run: `npm audit --omit=dev --registry=https://registry.npmjs.org && npm audit --omit=dev --prefix server --registry=https://registry.npmjs.org && powershell -File ../deploy/verify.ps1`

Expected: no unaccepted high-severity production vulnerabilities; manifest checks pass.

- [ ] **Step 3: Document credential-dependent checks**

Document exact sandbox checks for WeChat identity exchange and the production maintenance-window migration. Mark them blocked, not passed, until the corresponding credentials are installed.

- [ ] **Step 4: Review requirement coverage**

Confirm P0 acceptance items from the design spec: authorization isolation, token replay rejection, migration idempotency, consent enforcement, export isolation, deletion cooling period, crisis bypass of the model, HTTPS redirect and dependency audit.

- [ ] **Step 5: Commit the verified checkpoint**

```bash
git add app/README.md deploy/README.md
git commit -m "docs: record P0 production verification"
```

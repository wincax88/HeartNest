# Enable WeChat Production Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy anonymous-device deployment with the authenticated PostgreSQL deployment and make WeChat Mini Program login reach the real `jscode2session` exchange.

**Architecture:** Production startup requires the database, signing/encryption keys, and Mini Program credentials; App and H5 credentials remain optional until those clients are released. The health endpoint exposes only the active authentication mode so the deployment workflow can verify the new service internally before switching ingress away from the legacy workload. Runtime secrets are assembled without printing values, and the old PVC-backed deployment is retained at zero replicas for rollback.

**Tech Stack:** Node.js, Express, Vitest, GitHub Actions, GHCR, Kubernetes/Sealos, PostgreSQL, PowerShell

---

### Task 1: Make Mini Program authentication independently deployable

**Files:**
- Modify: `app/server/config.mjs`
- Modify: `app/server/app.mjs`
- Test: `app/tests/server/config.spec.mjs`
- Test: `app/tests/server/api.spec.mjs`

- [x] **Step 1: Add failing production configuration and health-mode tests**

```js
it('starts production with Mini Program credentials while App and H5 remain optional', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://test',
    TOKEN_SIGNING_KEY: 'x'.repeat(32),
    DATA_ENCRYPTION_KEY: 'y'.repeat(32),
    WECHAT_MINI_APP_ID: 'mini-app',
    WECHAT_MINI_SECRET: 'mini-secret',
  })
  expect(config.wechat.appId).toBeUndefined()
  expect(config.wechat.h5AppId).toBeUndefined()
})

it('reports whether provider authentication is active', async () => {
  const deviceApp = createApi({ store: createStore(dataFile), responder: async () => 'ok' })
  const providerApp = createApi({ store: createStore(dataFile), responder: async () => 'ok', authService: {} })
  expect(await health(deviceApp)).toEqual({ ok: true, authMode: 'device' })
  expect(await health(providerApp)).toEqual({ ok: true, authMode: 'provider' })
})
```

- [x] **Step 2: Run tests and verify RED**

Run: `cd app && npm test -- tests/server/config.spec.mjs tests/server/api.spec.mjs`

Expected: production configuration rejects missing App/H5 credentials and health responses omit `authMode`.

- [x] **Step 3: Implement the minimal server changes**

Keep only these identity keys in `REQUIRED_PRODUCTION_KEYS`:

```js
'WECHAT_MINI_APP_ID',
'WECHAT_MINI_SECRET',
```

Return the active mode from health without exposing credentials:

```js
app.get('/api/health', (_req, res) => res.json({ ok: true, authMode: authService ? 'provider' : 'device' }))
```

- [x] **Step 4: Run targeted tests and verify GREEN**

Run: `cd app && npm test -- tests/server/config.spec.mjs tests/server/api.spec.mjs`

Expected: both test files pass.

### Task 2: Make the deployment workflow create all required secrets and cut over safely

**Files:**
- Modify: `.github/workflows/deploy-sealos.yml`
- Modify: `deploy/verify.ps1`

- [x] **Step 1: Extend static deployment checks and verify RED**

Require the workflow to contain all of these markers:

```powershell
'WECHAT_MINI_SECRET'
'heartnest-postgres'
'POSTGRES_PASSWORD'
'authMode == "provider"'
'heartnest-web'
```

Run: `powershell -File deploy/verify.ps1 -StaticOnly`

Expected: FAIL because the current workflow does not assemble Mini Program credentials, create the PostgreSQL password secret, or verify provider mode.

- [x] **Step 2: Assemble runtime secrets without exposing values**

Pass `WECHAT_MINI_SECRET` separately, append it to `runtime.env`, source the file with `set -a`, require `POSTGRES_PASSWORD`, and create both Kubernetes secrets:

```bash
printf '\nWECHAT_MINI_SECRET=%s\n' "$WECHAT_MINI_SECRET" >> "$RUNNER_TEMP/runtime.env"
set -a
. "$RUNNER_TEMP/runtime.env"
set +a
test -n "$POSTGRES_PASSWORD"
kubectl -n "$NAMESPACE" create secret generic heartnest-postgres --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "$NAMESPACE" create secret generic heartnest-runtime --from-env-file="$RUNNER_TEMP/runtime.env" --dry-run=client -o yaml | kubectl apply -f -
```

- [x] **Step 3: Verify internally before replacing the legacy ingress**

After rollout, execute a Node health check from a new application Pod against `http://heartnest/api/health` and require `authMode` to be `provider`. Snapshot the old ingress, delete it only after the internal check passes, verify the public endpoint, restore the old ingress if public verification fails, and scale `heartnest-web` to zero only after success.

- [x] **Step 4: Verify workflow GREEN**

Run: `powershell -File deploy/verify.ps1 -StaticOnly`

Expected: `Static deployment checks passed.`

### Task 3: Verify, publish, configure and deploy

**Files:**
- Modify: `docs/release-checklist.md`

- [x] **Step 1: Run complete local verification**

Run: `cd app && npm test && npm run test:integration && npm run test:e2e && npm run type-check && npm run build:h5 && npm run build:mp-weixin`

Expected: all commands pass.

- [x] **Step 2: Merge and push `main`**

Commit the tested changes, fast-forward `main`, rerun unit tests, and push `main` to `origin`.

- [x] **Step 3: Configure GitHub without printing secret values**

Create the `heartnest-production` environment. Set `GHCR_PULL_USER`, `GHCR_PULL_TOKEN`, `HEARTNEST_RUNTIME_ENV`, and `BACKUP_ENCRYPTION_KEY`. The runtime environment contains `DATABASE_URL`, `POSTGRES_PASSWORD`, signing/encryption keys, and `WECHAT_MINI_APP_ID`; the existing `WECHAT_MINI_SECRET` is injected separately by the workflow.

- [x] **Step 4: Dispatch and monitor production release**

Run: `gh workflow run deploy-sealos.yml -f confirm_release=true`, then watch the resulting run to completion.

- [x] **Step 5: Verify live cutover**

Require all of the following:

```text
GET /api/health -> {"ok":true,"authMode":"provider"}
POST /api/auth/provider with an invalid diagnostic code -> PROVIDER_EXCHANGE_FAILED (not DEVICE_ID_REQUIRED)
deployment/heartnest -> 2 available replicas
deployment/heartnest-web -> 0 replicas
```

Do not claim real WeChat login success until a fresh `wx.login` code is tested in DevTools.

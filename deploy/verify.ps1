param(
  [switch]$StaticOnly,
  [string]$Kubeconfig = 'C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml'
)

$ErrorActionPreference = 'Stop'
$deployRoot = Split-Path -Parent $PSCommandPath
$requiredFiles = @('Dockerfile', 'backup.Dockerfile', 'app.yaml', 'postgres.yaml', 'migrate-job.yaml', 'backup-cronjob.yaml', 'restore-check-cronjob.yaml')

foreach ($file in $requiredFiles) {
  $path = Join-Path $deployRoot $file
  if (-not (Test-Path -LiteralPath $path)) { throw "Missing deployment file: $file" }
}

$manifestPaths = @('app.yaml', 'postgres.yaml', 'migrate-job.yaml', 'backup-cronjob.yaml', 'restore-check-cronjob.yaml') |
  ForEach-Object { Join-Path $deployRoot $_ }
$manifestText = Get-Content -Raw -LiteralPath $manifestPaths
$workloadText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'app.yaml')
$postgresText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'postgres.yaml')
$migrationText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'migrate-job.yaml')
$backupText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'backup-cronjob.yaml')
$restoreText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'restore-check-cronjob.yaml')
$workflowText = Get-Content -Raw -LiteralPath (Join-Path (Split-Path -Parent $deployRoot) '.github\workflows\deploy-sealos.yml')
$apiText = Get-Content -Raw -LiteralPath (Join-Path (Split-Path -Parent $deployRoot) 'app\server\app.mjs')
$dockerText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'Dockerfile')
$backupDockerText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'backup.Dockerfile')

if ($manifestText -match 'client-key-data|certificate-authority-data|\btoken\s*:') { throw 'Deployment files must never contain kubeconfig credentials.' }
if ($manifestText -match 'widget-demo-db') { throw 'HeartNest manifests must not reference widget-demo-db.' }
if ($manifestText -notmatch 'namespace:\s+ns-i61rahoe') { throw 'Manifests must target namespace ns-i61rahoe.' }
foreach ($required in @('kind: Deployment', 'kind: Service', 'kind: Ingress', 'kind: PodDisruptionBudget', 'replicas: 2', 'type: RollingUpdate', 'maxUnavailable: 0', 'maxSurge: 1', 'image: __IMAGE__', 'readinessProbe:', 'livenessProbe:', 'runAsNonRoot: true', 'readOnlyRootFilesystem: true', 'requests:', 'limits:')) {
  if ($workloadText -notmatch [regex]::Escape($required)) { throw "app.yaml is missing: $required" }
}
if ($workloadText -notmatch 'heartnest-ns-i61rahoe\.gzg\.sealos\.run') { throw 'The HeartNest public hostname is missing.' }
if ($workloadText -notmatch 'nginx\.ingress\.kubernetes\.io/ssl-redirect:\s+"true"') { throw 'HTTPS redirect must be enabled.' }
if ($workloadText -notmatch 'name:\s+DATABASE_URL[\s\S]+secretKeyRef:[\s\S]+name:\s+heartnest-runtime') { throw 'Workload must read DATABASE_URL from heartnest-runtime.' }
if ($postgresText -notmatch 'kind:\s+StatefulSet[\s\S]+name:\s+heartnest-postgres') { throw 'A HeartNest-only PostgreSQL StatefulSet is required.' }
if ($postgresText -notmatch 'image:\s+postgres:16-alpine') { throw 'PostgreSQL must use the pinned 16-alpine image.' }
if ($migrationText -notmatch 'kind:\s+Job[\s\S]+name:\s+heartnest-db-migrate') { throw 'A database migration Job is required.' }
if ($migrationText -notmatch 'server/db/migrate\.mjs') { throw 'Migration Job must run the database migration entry point.' }
foreach ($required in @('pg_dump', 'aes-256-cbc', 'pbkdf2', 'BACKUP_ENCRYPTION_KEY', '-mtime +30')) {
  if ($backupText -notmatch [regex]::Escape($required)) { throw "Backup job is missing: $required" }
}
foreach ($required in @('pg_restore', 'CREATE DATABASE', 'DROP DATABASE', 'latest-restore-status.json', 'audit_events')) {
  if ($restoreText -notmatch [regex]::Escape($required)) { throw "Restore check is missing: $required" }
}
if ($apiText -notmatch 'app\.use\(helmet\(') { throw 'API security headers must be enabled through Helmet.' }
foreach ($workflowRequirement in @(
  'docker/build-push-action',
  'heartnest-db-migrate',
  'rollout undo',
  '/api/health',
  '__IMAGE__',
  'WECHAT_MINI_SECRET',
  'heartnest-postgres',
  'POSTGRES_PASSWORD',
  'authMode == "provider"',
  'heartnest-web'
)) {
  if ($workflowText -notmatch [regex]::Escape($workflowRequirement)) { throw "Deployment workflow is missing: $workflowRequirement" }
}
if ($dockerText -notmatch 'FROM node@sha256:') { throw 'Docker base images must be pinned by digest.' }
if ($dockerText -notmatch 'USER node') { throw 'Container must run as the node user.' }
if ($backupDockerText -notmatch 'postgres@sha256:' -or $backupDockerText -notmatch 'apk add --no-cache openssl') { throw 'Backup image must pin PostgreSQL and include OpenSSL.' }
if ($workflowText -match 'PVC|uploader\.yaml|workload-actions\.yaml|workload\.yaml|publish\.ps1') { throw 'Workflow must not use the legacy PVC uploader flow.' }

Write-Host 'Static deployment checks passed.'
if ($StaticOnly) { exit 0 }

if (-not (Test-Path -LiteralPath $Kubeconfig)) { throw "Kubeconfig not found: $Kubeconfig" }
kubectl --kubeconfig $Kubeconfig -n ns-i61rahoe get deployment/heartnest service/heartnest ingress/heartnest poddisruptionbudget/heartnest
if ($LASTEXITCODE -ne 0) { throw 'One or more HeartNest Kubernetes resources are unavailable.' }
kubectl --kubeconfig $Kubeconfig -n ns-i61rahoe rollout status deployment/heartnest --timeout=120s
if ($LASTEXITCODE -ne 0) { throw 'HeartNest deployment rollout is not healthy.' }

Write-Host 'Live deployment checks passed.'

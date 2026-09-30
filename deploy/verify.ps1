param(
  [switch]$StaticOnly,
  [string]$Kubeconfig = 'C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml'
)

$ErrorActionPreference = 'Stop'
$deployRoot = Split-Path -Parent $PSCommandPath
$requiredFiles = @(
  'nginx.conf',
  'pvc.yaml',
  'uploader.yaml',
  'workload.yaml',
  'publish.ps1',
  'postgres.yaml',
  'migrate-job.yaml',
  'workload-actions.yaml'
)

foreach ($file in $requiredFiles) {
  $path = Join-Path $deployRoot $file
  if (-not (Test-Path -LiteralPath $path)) { throw "Missing deployment file: $file" }
}

$manifestPaths = @('pvc.yaml', 'uploader.yaml', 'workload.yaml', 'postgres.yaml', 'migrate-job.yaml', 'workload-actions.yaml') |
  ForEach-Object { Join-Path $deployRoot $_ }
$manifestText = Get-Content -Raw -LiteralPath $manifestPaths
$workloadText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'workload-actions.yaml')
$postgresText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'postgres.yaml')
$migrationText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'migrate-job.yaml')
$workflowText = Get-Content -Raw -LiteralPath (Join-Path (Split-Path -Parent $deployRoot) '.github\workflows\deploy-sealos.yml')
$apiText = Get-Content -Raw -LiteralPath (Join-Path (Split-Path -Parent $deployRoot) 'app\server\app.mjs')
$nginxText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'nginx.conf')

if ($manifestText -match 'client-key-data|certificate-authority-data|\btoken\s*:') { throw 'Deployment files must never contain kubeconfig credentials.' }
if ($manifestText -match 'widget-demo-db') { throw 'HeartNest manifests must not reference widget-demo-db.' }
if ($manifestText -notmatch 'namespace:\s+ns-i61rahoe') { throw 'Manifests must target namespace ns-i61rahoe.' }
foreach ($required in @('kind: Deployment', 'kind: Service', 'kind: Ingress', 'readinessProbe:', 'livenessProbe:', 'requests:', 'limits:')) {
  if ($workloadText -notmatch [regex]::Escape($required)) { throw "workload.yaml is missing: $required" }
}
if ($workloadText -notmatch 'heartnest-ns-i61rahoe\.gzg\.sealos\.run') { throw 'The HeartNest public hostname is missing.' }
if ($workloadText -notmatch 'nginx\.ingress\.kubernetes\.io/ssl-redirect:\s+"true"') { throw 'HTTPS redirect must be enabled.' }
if ($workloadText -notmatch 'name:\s+DATABASE_URL[\s\S]+secretKeyRef:[\s\S]+name:\s+heartnest-runtime') { throw 'Workload must read DATABASE_URL from heartnest-runtime.' }
if ($postgresText -notmatch 'kind:\s+StatefulSet[\s\S]+name:\s+heartnest-postgres') { throw 'A HeartNest-only PostgreSQL StatefulSet is required.' }
if ($postgresText -notmatch 'image:\s+postgres:16-alpine') { throw 'PostgreSQL must use the pinned 16-alpine image.' }
if ($migrationText -notmatch 'kind:\s+Job[\s\S]+name:\s+heartnest-db-migrate') { throw 'A database migration Job is required.' }
if ($migrationText -notmatch 'server/db/migrate\.mjs') { throw 'Migration Job must run the database migration entry point.' }
if ($apiText -notmatch 'app\.use\(helmet\(') { throw 'API security headers must be enabled through Helmet.' }
foreach ($workflowRequirement in @('heartnest-json-backup', '--dry-run', 'heartnest-db-migrate', 'actions/upload-artifact')) {
  if ($workflowText -notmatch [regex]::Escape($workflowRequirement)) { throw "Deployment workflow is missing: $workflowRequirement" }
}
if ($nginxText -notmatch 'try_files \$uri \$uri/ /index\.html') { throw 'nginx SPA fallback is missing.' }

Write-Host 'Static deployment checks passed.'
if ($StaticOnly) { exit 0 }

if (-not (Test-Path -LiteralPath $Kubeconfig)) { throw "Kubeconfig not found: $Kubeconfig" }
kubectl --kubeconfig $Kubeconfig -n ns-i61rahoe get deployment/heartnest-web service/heartnest-web ingress/heartnest-web pvc/heartnest-web
if ($LASTEXITCODE -ne 0) { throw 'One or more HeartNest Kubernetes resources are unavailable.' }
kubectl --kubeconfig $Kubeconfig -n ns-i61rahoe rollout status deployment/heartnest-web --timeout=120s
if ($LASTEXITCODE -ne 0) { throw 'HeartNest deployment rollout is not healthy.' }

Write-Host 'Live deployment checks passed.'

param(
  [switch]$StaticOnly,
  [string]$Kubeconfig = 'C:\Users\Admin\Documents\HeartNest\kubeconfig (1).yaml'
)

$ErrorActionPreference = 'Stop'
$deployRoot = Split-Path -Parent $PSCommandPath
$requiredFiles = @('nginx.conf', 'pvc.yaml', 'uploader.yaml', 'workload.yaml', 'publish.ps1')

foreach ($file in $requiredFiles) {
  $path = Join-Path $deployRoot $file
  if (-not (Test-Path -LiteralPath $path)) { throw "Missing deployment file: $file" }
}

$manifestText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'pvc.yaml'), (Join-Path $deployRoot 'uploader.yaml'), (Join-Path $deployRoot 'workload.yaml')
$workloadText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'workload.yaml')
$nginxText = Get-Content -Raw -LiteralPath (Join-Path $deployRoot 'nginx.conf')

if ($manifestText -match 'client-key-data|certificate-authority-data|\btoken\s*:') { throw 'Deployment files must never contain kubeconfig credentials.' }
if ($manifestText -notmatch 'namespace:\s+ns-i61rahoe') { throw 'Manifests must target namespace ns-i61rahoe.' }
foreach ($required in @('kind: Deployment', 'kind: Service', 'kind: Ingress', 'readinessProbe:', 'livenessProbe:', 'requests:', 'limits:')) {
  if ($workloadText -notmatch [regex]::Escape($required)) { throw "workload.yaml is missing: $required" }
}
if ($workloadText -notmatch 'heartnest-ns-i61rahoe\.gzg\.sealos\.run') { throw 'The HeartNest public hostname is missing.' }
if ($nginxText -notmatch 'try_files \$uri \$uri/ /index\.html') { throw 'nginx SPA fallback is missing.' }

Write-Host 'Static deployment checks passed.'
if ($StaticOnly) { exit 0 }

if (-not (Test-Path -LiteralPath $Kubeconfig)) { throw "Kubeconfig not found: $Kubeconfig" }
kubectl --kubeconfig $Kubeconfig -n ns-i61rahoe get deployment/heartnest-web service/heartnest-web ingress/heartnest-web pvc/heartnest-web
if ($LASTEXITCODE -ne 0) { throw 'One or more HeartNest Kubernetes resources are unavailable.' }
kubectl --kubeconfig $Kubeconfig -n ns-i61rahoe rollout status deployment/heartnest-web --timeout=120s
if ($LASTEXITCODE -ne 0) { throw 'HeartNest deployment rollout is not healthy.' }

Write-Host 'Live deployment checks passed.'

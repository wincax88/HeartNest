param(
  [Parameter(Mandatory = $true)]
  [string]$Kubeconfig
)

$ErrorActionPreference = 'Stop'
$namespace = 'ns-i61rahoe'
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$appRoot = Join-Path $repoRoot 'app'
$buildRoot = Join-Path $appRoot 'dist\build\h5'
$deployRoot = Split-Path -Parent $PSCommandPath

if (-not (Test-Path -LiteralPath $Kubeconfig)) { throw "Kubeconfig not found: $Kubeconfig" }

Push-Location $appRoot
try {
  npm run build:h5
  if ($LASTEXITCODE -ne 0) { throw 'H5 build failed.' }
} finally {
  Pop-Location
}

kubectl --kubeconfig $Kubeconfig -n $namespace apply -f (Join-Path $deployRoot 'pvc.yaml')
if ($LASTEXITCODE -ne 0) { throw 'PVC apply failed.' }

kubectl --kubeconfig $Kubeconfig -n $namespace delete pod heartnest-uploader --ignore-not-found=true --wait=true
if ($LASTEXITCODE -ne 0) { throw 'Could not remove the previous uploader pod.' }
kubectl --kubeconfig $Kubeconfig -n $namespace apply -f (Join-Path $deployRoot 'uploader.yaml')
if ($LASTEXITCODE -ne 0) { throw 'Uploader pod apply failed.' }

try {
  kubectl --kubeconfig $Kubeconfig -n $namespace wait --for=condition=Ready pod/heartnest-uploader --timeout=180s
  if ($LASTEXITCODE -ne 0) { throw 'Uploader pod did not become ready.' }
  kubectl --kubeconfig $Kubeconfig -n $namespace exec heartnest-uploader -- sh -c 'find /site -mindepth 1 -maxdepth 1 -exec rm -rf {} +'
  if ($LASTEXITCODE -ne 0) { throw 'Could not clear the HeartNest site volume.' }
  kubectl --kubeconfig $Kubeconfig -n $namespace cp "$buildRoot\." 'heartnest-uploader:/site'
  if ($LASTEXITCODE -ne 0) { throw 'Could not upload the H5 build.' }
} finally {
  kubectl --kubeconfig $Kubeconfig -n $namespace delete pod heartnest-uploader --ignore-not-found=true --wait=true
}

kubectl --kubeconfig $Kubeconfig -n $namespace apply -f (Join-Path $deployRoot 'workload.yaml')
if ($LASTEXITCODE -ne 0) { throw 'Workload apply failed.' }
kubectl --kubeconfig $Kubeconfig -n $namespace rollout status deployment/heartnest-web --timeout=180s
if ($LASTEXITCODE -ne 0) { throw 'HeartNest rollout did not complete.' }

Write-Host 'HeartNest published: https://heartnest-ns-i61rahoe.gzg.sealos.run/'

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
$kubectlBase = @('--kubeconfig', $Kubeconfig, '-n', $namespace)

function Invoke-Kube {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [Parameter(Mandatory = $true)]
    [string]$FailureMessage
  )

  for ($attempt = 1; $attempt -le 3; $attempt++) {
    & kubectl @kubectlBase @Arguments
    if ($LASTEXITCODE -eq 0) { return }
    if ($attempt -lt 3) {
      Write-Warning "kubectl attempt $attempt failed; retrying in 3 seconds."
      Start-Sleep -Seconds 3
    }
  }
  throw $FailureMessage
}

if (-not (Test-Path -LiteralPath $Kubeconfig)) { throw "Kubeconfig not found: $Kubeconfig" }

Push-Location $appRoot
try {
  npm run build:h5
  if ($LASTEXITCODE -ne 0) { throw 'H5 build failed.' }
} finally {
  Pop-Location
}

Invoke-Kube -Arguments @('apply', '-f', (Join-Path $deployRoot 'pvc.yaml')) -FailureMessage 'PVC apply failed.'

Invoke-Kube -Arguments @('delete', 'pod', 'heartnest-uploader', '--ignore-not-found=true', '--wait=true') -FailureMessage 'Could not remove the previous uploader pod.'
Invoke-Kube -Arguments @('apply', '-f', (Join-Path $deployRoot 'uploader.yaml')) -FailureMessage 'Uploader pod apply failed.'

try {
  Invoke-Kube -Arguments @('wait', '--for=condition=Ready', 'pod/heartnest-uploader', '--timeout=180s') -FailureMessage 'Uploader pod did not become ready.'
  Invoke-Kube -Arguments @('exec', 'heartnest-uploader', '--', 'sh', '-c', 'find /site -mindepth 1 -maxdepth 1 -exec rm -rf {} +') -FailureMessage 'Could not clear the HeartNest site volume.'
  Push-Location $repoRoot
  try {
    Invoke-Kube -Arguments @('cp', 'app/dist/build/h5/.', 'heartnest-uploader:/site') -FailureMessage 'Could not upload the H5 build.'
  } finally {
    Pop-Location
  }
} finally {
  Invoke-Kube -Arguments @('delete', 'pod', 'heartnest-uploader', '--ignore-not-found=true', '--wait=true') -FailureMessage 'Could not remove the uploader pod after publishing.'
}

Invoke-Kube -Arguments @('apply', '-f', (Join-Path $deployRoot 'workload.yaml')) -FailureMessage 'Workload apply failed.'
Invoke-Kube -Arguments @('rollout', 'status', 'deployment/heartnest-web', '--timeout=180s') -FailureMessage 'HeartNest rollout did not complete.'

Write-Host 'HeartNest published: https://heartnest-ns-i61rahoe.gzg.sealos.run/'

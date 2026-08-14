$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackendPath = Join-Path $Root "node-backend"
$LogPath = Join-Path $Root ".node-backend.log"
$ErrPath = Join-Path $Root ".node-backend.err.log"

Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }

Start-Process -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev") `
  -WorkingDirectory $BackendPath `
  -RedirectStandardOutput $LogPath `
  -RedirectStandardError $ErrPath `
  -WindowStyle Hidden

Start-Sleep -Seconds 5

try {
  $health = Invoke-RestMethod "http://127.0.0.1:5000/health" -TimeoutSec 5
  $health | ConvertTo-Json -Compress
} catch {
  Write-Host "Backend did not respond yet. Check $LogPath and $ErrPath"
  throw
}

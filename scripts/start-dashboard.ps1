param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$LogPath = Join-Path $Root ".vite.log"
$ErrPath = Join-Path $Root ".vite.err.log"

Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }

Start-Process -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--host", "0.0.0.0", "--port", "$Port") `
  -WorkingDirectory $Root `
  -RedirectStandardOutput $LogPath `
  -RedirectStandardError $ErrPath `
  -WindowStyle Hidden

Start-Sleep -Seconds 3

try {
  $status = (Invoke-WebRequest "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 5).StatusCode
  Write-Host "Attendify dashboard running on http://127.0.0.1:$Port ($status)"
} catch {
  Write-Host "Dashboard did not respond yet. Check $LogPath and $ErrPath"
  throw
}

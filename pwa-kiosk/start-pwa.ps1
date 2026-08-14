param(
  [int]$Port = 5178
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$LogPath = Join-Path $Root ".pwa-kiosk.log"
$ErrPath = Join-Path $Root ".pwa-kiosk.err.log"

Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }

$arguments = @("run", "dev", "--", "--host", "0.0.0.0", "--port", "$Port")
Start-Process -FilePath "npm.cmd" `
  -ArgumentList $arguments `
  -WorkingDirectory $PSScriptRoot `
  -RedirectStandardOutput $LogPath `
  -RedirectStandardError $ErrPath `
  -WindowStyle Hidden

Start-Sleep -Seconds 3

try {
  $status = (Invoke-WebRequest "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 5).StatusCode
  Write-Host "Attendify PWA kiosk running on http://127.0.0.1:$Port ($status)"
} catch {
  Write-Host "PWA kiosk did not respond yet. Check $LogPath and $ErrPath"
  throw
}

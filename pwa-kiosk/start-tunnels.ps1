$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackendLog = Join-Path $Root ".tunnel-backend.log"
$BackendErr = Join-Path $Root ".tunnel-backend.err.log"
$PwaLog = Join-Path $Root ".tunnel-pwa.log"
$PwaErr = Join-Path $Root ".tunnel-pwa.err.log"

Start-Process -FilePath "npx.cmd" `
  -ArgumentList @("--yes", "localtunnel", "--port", "5000") `
  -WorkingDirectory $Root `
  -RedirectStandardOutput $BackendLog `
  -RedirectStandardError $BackendErr `
  -WindowStyle Hidden

Start-Sleep -Seconds 5

$backendUrl = (Get-Content $BackendLog | Select-String -Pattern "https://[a-z0-9-]+\.loca\.lt" | Select-Object -Last 1).Matches.Value
if (-not $backendUrl) {
  throw "Backend tunnel URL not found. Check $BackendLog"
}

Start-Process -FilePath "npx.cmd" `
  -ArgumentList @("--yes", "localtunnel", "--port", "5178") `
  -WorkingDirectory $Root `
  -RedirectStandardOutput $PwaLog `
  -RedirectStandardError $PwaErr `
  -WindowStyle Hidden

Start-Sleep -Seconds 5

$pwaUrl = (Get-Content $PwaLog | Select-String -Pattern "https://[a-z0-9-]+\.loca\.lt" | Select-Object -Last 1).Matches.Value
if (-not $pwaUrl) {
  throw "PWA tunnel URL not found. Check $PwaLog"
}

$finalUrl = "$pwaUrl/?api=$([uri]::EscapeDataString($backendUrl))"
npm exec --yes qrcode -- -o pwa-kiosk-tunnel-qr.png $finalUrl | Out-Null

[pscustomobject]@{
  BackendTunnel = $backendUrl
  PwaTunnel = $finalUrl
  Qr = (Join-Path $Root "pwa-kiosk-tunnel-qr.png")
} | ConvertTo-Json -Compress

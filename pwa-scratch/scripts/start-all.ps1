$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backend = Join-Path $root "backend"
$web = Join-Path $root "web"

foreach ($port in @(5055, 5176)) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

if (!(Test-Path (Join-Path $backend "node_modules"))) {
  npm --prefix $backend install | Out-Host
}

if (!(Test-Path (Join-Path $web "node_modules"))) {
  npm --prefix $web install | Out-Host
}

$backendProcess = New-Object System.Diagnostics.ProcessStartInfo
$backendProcess.FileName = "cmd.exe"
$backendProcess.Arguments = "/c cd /d `"$backend`" && npm start > `"$root\.backend.log`" 2>&1"
$backendProcess.WindowStyle = "Hidden"
$backendProcess.CreateNoWindow = $true
[System.Diagnostics.Process]::Start($backendProcess) | Out-Null

$webProcess = New-Object System.Diagnostics.ProcessStartInfo
$webProcess.FileName = "cmd.exe"
$webProcess.Arguments = "/c cd /d `"$web`" && npm run dev > `"$root\.web.log`" 2>&1"
$webProcess.WindowStyle = "Hidden"
$webProcess.CreateNoWindow = $true
[System.Diagnostics.Process]::Start($webProcess) | Out-Null

Start-Sleep -Seconds 6

Write-Host "Backend:"
Invoke-RestMethod "http://127.0.0.1:5055/health" | ConvertTo-Json -Depth 4
Write-Host "PWA:"
(Invoke-WebRequest "http://127.0.0.1:5176" -UseBasicParsing).StatusCode
Write-Host "Open:"
Write-Host "http://127.0.0.1:5176"

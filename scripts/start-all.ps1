param(
  [switch]$ClearExpoCache
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackendDir = Join-Path $Root "node-backend"
$KioskDir = Join-Path $Root "kiosk-app"

function Start-ProcessIfPortFree {
  param(
    [int]$Port,
    [string]$Name,
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory
  )

  $portBusy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($portBusy) {
    Write-Host "$Name already running on port $Port."
    return
  }

  Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -WindowStyle Hidden
  Write-Host "Started $Name on port $Port."
}

Write-Host "Starting Attendify stack..."

$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
  try {
    $mongo = docker ps -a --filter "name=attendify-mongo" --format "{{.Names}}" 2>$null
    if ($LASTEXITCODE -eq 0 -and $mongo -contains "attendify-mongo") {
      docker start attendify-mongo | Out-Null
      Write-Host "MongoDB container started."
    } elseif ($LASTEXITCODE -eq 0) {
      docker run -d --name attendify-mongo -p 27017:27017 -v attendify-mongo-data:/data/db mongo:7 | Out-Null
      Write-Host "MongoDB container created and started."
    } else {
      Write-Host "Docker CLI found but Docker daemon is not running. Expecting MongoDB to already be running on 127.0.0.1:27017."
    }
  } catch {
    Write-Host "Docker is unavailable right now. Expecting MongoDB to already be running on 127.0.0.1:27017."
  }
} else {
  Write-Host "Docker CLI was not found. Expecting MongoDB to already be running on 127.0.0.1:27017."
}

$mongoReady = $false
for ($attempt = 1; $attempt -le 10; $attempt++) {
  $mongoReady = (Test-NetConnection 127.0.0.1 -Port 27017 -WarningAction SilentlyContinue).TcpTestSucceeded
  if ($mongoReady) {
    break
  }
  Start-Sleep -Seconds 1
}

if (!$mongoReady) {
  throw "MongoDB is not reachable on 127.0.0.1:27017. Start Docker Desktop/MongoDB first, then run npm run start:all again."
}

if (!(Test-Path (Join-Path $BackendDir "node_modules"))) {
  Write-Host "Installing JS backend dependencies..."
  npm install --prefix $BackendDir | Out-Host
}

if (!(Test-Path (Join-Path $Root "node_modules"))) {
  Write-Host "Installing web dashboard dependencies..."
  npm install --prefix $Root | Out-Host
}

if (!(Test-Path (Join-Path $KioskDir "node_modules"))) {
  Write-Host "Installing kiosk dependencies..."
  npm install --prefix $KioskDir | Out-Host
}

Start-ProcessIfPortFree `
  -Port 5000 `
  -Name "JS Backend API" `
  -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev") `
  -WorkingDirectory $BackendDir

Start-ProcessIfPortFree `
  -Port 5173 `
  -Name "Web dashboard" `
  -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--host", "0.0.0.0") `
  -WorkingDirectory $Root

$expoArgs = @("expo", "start", "--host", "lan")
if ($ClearExpoCache) {
  $expoArgs += "--clear"
}

Start-ProcessIfPortFree `
  -Port 8081 `
  -Name "Expo Metro" `
  -FilePath "npx.cmd" `
  -ArgumentList $expoArgs `
  -WorkingDirectory $KioskDir

Start-Sleep -Seconds 5

$wifiIp = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch "vEthernet|WSL|Docker|Loopback" -and $_.InterfaceAlias -match "Wi-Fi|Wireless|Ethernet" } |
  Select-Object -First 1 -ExpandProperty IPAddress

if (!$wifiIp) {
  $wifiIp = "YOUR_COMPUTER_LAN_IP"
}

Write-Host ""
Write-Host "Attendify is starting/running:"
Write-Host "Backend health:   http://127.0.0.1:5000/health"
Write-Host "Web dashboard:    http://127.0.0.1:5173"
Write-Host "Expo Metro:       http://127.0.0.1:8081/status"
Write-Host "Expo URL:         exp://$wifiIp`:8081"
Write-Host ""
Write-Host "Use these in the mobile kiosk app:"
Write-Host "API Base URL:         http://$wifiIp`:5000"
Write-Host "Recognition API URL: http://$wifiIp`:5000"

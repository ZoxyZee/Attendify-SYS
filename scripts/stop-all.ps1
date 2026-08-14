$ErrorActionPreference = "SilentlyContinue"

Write-Host "Stopping Attendify local services..."

$ports = @(5000, 5173, 8081)
$pids = Get-NetTCPConnection -LocalPort $ports -State Listen |
  Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $pids) {
  Stop-Process -Id $processId -Force
  Write-Host "Stopped process $processId."
}

Write-Host "Stopping MongoDB container..."
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker stop attendify-mongo | Out-Null
} else {
  Write-Host "Docker CLI not found; skipped MongoDB container stop."
}

Write-Host "Done."

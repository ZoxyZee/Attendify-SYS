$ErrorActionPreference = "SilentlyContinue"

foreach ($port in @(5055, 5060, 5176)) {
  Get-NetTCPConnection -LocalPort $port -State Listen |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force }
}

Write-Host "Attendify PWA scratch services stopped."

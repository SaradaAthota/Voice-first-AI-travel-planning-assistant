# PowerShell script to kill process using port 3000
# Usage: .\kill-port-3000.ps1

Write-Host "Checking for processes using port 3000..." -ForegroundColor Yellow

$processes = netstat -ano | findstr :3000 | ForEach-Object {
    $parts = $_ -split '\s+'
    if ($parts.Length -gt 4) {
        $parts[-1]
    }
} | Select-Object -Unique

if ($processes) {
    foreach ($pid in $processes) {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Found process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Cyan
            Stop-Process -Id $pid -Force
            Write-Host "Killed process $pid" -ForegroundColor Green
        }
    }
    Write-Host "`nPort 3000 is now free!" -ForegroundColor Green
} else {
    Write-Host "No process found using port 3000" -ForegroundColor Green
}

# Verify
Start-Sleep -Seconds 1
$stillInUse = netstat -ano | findstr :3000
if ($stillInUse) {
    Write-Host "Warning: Port 3000 may still be in use" -ForegroundColor Red
} else {
    Write-Host "Port 3000 is confirmed free" -ForegroundColor Green
}



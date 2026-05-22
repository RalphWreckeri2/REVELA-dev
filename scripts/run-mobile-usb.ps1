# Run REVELA mobile on a USB-connected Android device.
# Usage:
#   & "C:\REVELAsys\DEVELOPMENT\scripts\run-mobile-usb.ps1"
param(
    [int]$Port = 5000
)

$ErrorActionPreference = "Stop"
$devRoot = Split-Path $PSScriptRoot -Parent
$mobile = Join-Path $devRoot "revela_mobile"
$localProps = Join-Path $mobile "android\local.properties"

if (-not (Test-Path $mobile)) {
    Write-Error "Flutter project not found at: $mobile"
}

Write-Host "Setting up adb reverse (device :$Port -> PC :$Port)..." -ForegroundColor Cyan
adb reverse "tcp:${Port}" "tcp:${Port}"
if ($LASTEXITCODE -ne 0) {
    Write-Error "adb reverse failed. Enable USB debugging and confirm the device with: adb devices"
}

Write-Host ""
Write-Host "Start the backend in another terminal:" -ForegroundColor Yellow
Write-Host "  cd $devRoot\revela_backend"
Write-Host "  python app.py"
Write-Host ""
Write-Host "Launching Flutter on the connected device..." -ForegroundColor Cyan
Set-Location $mobile
flutter run --dart-define=API_BASE=http://127.0.0.1:${Port}

# ==============================================================================
# SLD SYSTEM - DATA TRANSFER & CLEANUP SCRIPT (PowerShell / Windows)
# Usage:
#   .\transfer_data.ps1 -Action clean-downloads
#   .\transfer_data.ps1 -Action statutes -MinSr 5870 -MaxSr 9372 -SourceUri "mongodb+srv://..."
#   .\transfer_data.ps1 -Action users -SourceUri "mongodb+srv://..."
#   .\transfer_data.ps1 -Action all -SourceUri "mongodb+srv://..."
# ==============================================================================

param (
    [string]$Action = "all",
    [int]$MinSr = 5870,
    [int]$MaxSr = 9372,
    [string]$SourceUri = "",
    [string]$TargetUri = "mongodb://127.0.0.1:27017/sld_system"
)

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   SLD SYSTEM - ADMIN DATA MANAGEMENT & TRANSFER TOOL             " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

if ($SourceUri -ne "") {
    $env:SOURCE_MONGODB_URI = $SourceUri
}
if ($TargetUri -ne "") {
    $env:MONGODB_URI = $TargetUri
}

Write-Host "Target Database : $env:MONGODB_URI" -ForegroundColor Gray
if ($env:SOURCE_MONGODB_URI) {
    Write-Host "Source Database : $env:SOURCE_MONGODB_URI" -ForegroundColor Gray
}
Write-Host "Action          : $Action" -ForegroundColor Green
Write-Host ""

Set-Location -Path $PSScriptRoot\backend
node src/scripts/adminDataOperations.js $Action $MinSr $MaxSr
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DATA OPERATION FINISHED!                                       " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan

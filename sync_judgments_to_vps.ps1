<#
.SYNOPSIS
    Syncs the updated case judgments from local computer to remote VPS MongoDB.
.DESCRIPTION
    Reads the clean delta file (compressed or raw) and bulk-updates the 
    judgment fields on the VPS MongoDB database using indexed lookups.
.PARAMETER VpsUri
    The MongoDB connection URI for your VPS database.
    If MongoDB runs locally on the VPS (not publicly exposed), you can use an SSH tunnel
    (e.g., mongodb://127.0.0.1:27018/sld_system) or run the sync directly on the VPS.
.EXAMPLE
    .\sync_judgments_to_vps.ps1
.EXAMPLE
    .\sync_judgments_to_vps.ps1 -VpsUri "mongodb://127.0.0.1:27018/sld_system"
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false, Position = 0)]
    [string]$VpsUri
)

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SLD SYSTEM - SYNC JUDGMENTS TO VPS MONGODB" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$DeltaGz = "backend\scratch\transferred_judgments_delta.json.gz"
$DeltaRaw = "backend\scratch\transferred_judgments_delta.json"

if (Test-Path $DeltaGz) {
    $TargetPayload = $DeltaGz
} elseif (Test-Path $DeltaRaw) {
    $TargetPayload = $DeltaRaw
} else {
    Write-Host "[ERROR] Neither $DeltaGz nor $DeltaRaw was found." -ForegroundColor Red
    Write-Host "Please ensure the local replacement process has completed first." -ForegroundColor Yellow
    exit 1
}

$FileInfo = Get-Item $TargetPayload
$FileSizeMB = [math]::Round($FileInfo.Length / 1MB, 2)
Write-Host "[OK] Found delta payload: $TargetPayload ($FileSizeMB MB)" -ForegroundColor Green

if ([string]::IsNullOrWhiteSpace($VpsUri)) {
    Write-Host ""
    Write-Host "NOTE: If your VPS MongoDB is running locally on the VPS (not exposed to internet):" -ForegroundColor Cyan
    Write-Host "  Step 1: Open another PowerShell window and start an SSH tunnel:" -ForegroundColor White
    Write-Host "          ssh -L 27018:127.0.0.1:27017 user@YOUR_VPS_IP -N" -ForegroundColor Yellow
    Write-Host "  Step 2: Enter the tunnel URI below: mongodb://127.0.0.1:27018/sld_system" -ForegroundColor White
    Write-Host ""
    $VpsUri = Read-Host "Enter VPS MongoDB URI (Default: mongodb://127.0.0.1:27018/sld_system)"
    if ([string]::IsNullOrWhiteSpace($VpsUri)) {
        $VpsUri = "mongodb://127.0.0.1:27018/sld_system"
    }
}

Write-Host ""
Write-Host "[INFO] Starting VPS Synchronization with: $VpsUri" -ForegroundColor Cyan
Write-Host ""

# Run Node.js sync runner
$cmd = "node backend\src\scripts\sync_judgments_to_vps.js --uri=`"$VpsUri`""
Invoke-Expression $cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] All 19,471 updated judgments have been successfully synced to your VPS MongoDB!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERROR] Synchronization encountered an issue. See details above." -ForegroundColor Red
}

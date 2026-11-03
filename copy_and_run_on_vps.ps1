<#
.SYNOPSIS
    Transfers the delta payload to your VPS and executes the update directly on the VPS.
.DESCRIPTION
    Uses SCP to upload the compressed delta file (72 MB) and sync script to the VPS,
    then executes the update directly against the local MongoDB instance on the VPS.
.PARAMETER VpsHost
    The VPS SSH host or user@ip (e.g. root@198.51.100.1).
.PARAMETER VpsDir
    The path to your sld_system project directory on the VPS (e.g. /root/sld_system or /var/www/sld_system).
.EXAMPLE
    .\copy_and_run_on_vps.ps1 -VpsHost root@198.51.100.1 -VpsDir /root/sld_system
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$VpsHost = "root@srv2028761",

    [Parameter(Mandatory = $false)]
    [string]$VpsDir = "/var/www/sld_system"
)

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SLD SYSTEM - DIRECT VPS SHIFT & UPDATE" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$DeltaGz = "backend\scratch\transferred_judgments_delta.json.gz"
$SyncScript = "backend\src\scripts\sync_judgments_to_vps.js"

if (-not (Test-Path $DeltaGz)) {
    Write-Host "[ERROR] Compressed payload not found at $DeltaGz." -ForegroundColor Red
    exit 1
}

Write-Host "Target VPS: $VpsHost" -ForegroundColor Green
Write-Host "Target Dir: $VpsDir" -ForegroundColor Green
Write-Host ""

Write-Host "[1/4] Ensuring remote directories exist on VPS..." -ForegroundColor Cyan
ssh $VpsHost "mkdir -p $($VpsDir)/backend/scratch $($VpsDir)/backend/src/scripts"

Write-Host "[2/4] Uploading compressed payload (72 MB) to VPS..." -ForegroundColor Cyan
scp $DeltaGz "$($VpsHost):$($VpsDir)/backend/scratch/"

Write-Host "[3/4] Uploading sync script to VPS..." -ForegroundColor Cyan
scp $SyncScript "$($VpsHost):$($VpsDir)/backend/src/scripts/"

Write-Host "[4/4] Running sync directly on VPS against local MongoDB..." -ForegroundColor Cyan
ssh $VpsHost "cd $($VpsDir) && node backend/src/scripts/sync_judgments_to_vps.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Completed! All 19,471 judgments are now updated on your VPS database." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[NOTICE] If there was a path or connection issue, review the output above." -ForegroundColor Yellow
}


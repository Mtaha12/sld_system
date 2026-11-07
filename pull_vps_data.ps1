<#
.SYNOPSIS
    Pulls MongoDB data and attachment files from the production VPS to the local computer.
.DESCRIPTION
    1. Connects to the VPS via SSH.
    2. Runs 'mongodump' on the VPS for the chosen collections (Statutes, Notifications, or Full DB).
    3. Transfers the dump archive to the local machine via SCP.
    4. Syncs attachment files from VPS 'uploads/reference_views/' to local 'backend/uploads/reference_views/'.
    5. Restores the data into the local MongoDB (mongodb://127.0.0.1:27017/sld_system) using 'mongorestore'.
    6. Cleans up temporary dump files on the VPS.
.EXAMPLE
    .\pull_vps_data.ps1
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$VpsIp = "201.18.218.3",

    [Parameter(Mandatory = $false)]
    [string]$VpsUser = "root",

    [Parameter(Mandatory = $false)]
    [string]$LocalMongoUri = "mongodb://127.0.0.1:27017/sld_system"
)

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SLD SYSTEM - PULL MONGODB DATA FROM VPS TO LOCAL       " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Confirm VPS IP
$inputIp = Read-Host "Enter VPS IP address (Press ENTER for default: $VpsIp)"
if (![string]::IsNullOrWhiteSpace($inputIp)) {
    $VpsIp = $inputIp.Trim()
}

# 2. Select transfer scope
Write-Host ""
Write-Host "Select what data you want to pull from the VPS:" -ForegroundColor White
Write-Host "  [1] Statutes & Notifications only + Attachments (Recommended)" -ForegroundColor Green
Write-Host "  [2] Statutes only + Attachments" -ForegroundColor White
Write-Host "  [3] Notifications only + Attachments" -ForegroundColor White
Write-Host "  [4] Full Database (All collections) + Attachments" -ForegroundColor Yellow
$choice = Read-Host "Choose option [1-4] (Default: 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

$ScopeName = "Statutes & Notifications"
$Collections = @("statutes", "notifications")
$IncludeFilter = ""

switch ($choice.Trim()) {
    "2" {
        $ScopeName = "Statutes only"
        $Collections = @("statutes")
        $IncludeFilter = "--collection=statutes"
    }
    "3" {
        $ScopeName = "Notifications only"
        $Collections = @("notifications")
        $IncludeFilter = "--collection=notifications"
    }
    "4" {
        $ScopeName = "Full Database"
        $Collections = @()
        $IncludeFilter = ""
    }
    default {
        $ScopeName = "Statutes & Notifications"
        $Collections = @("statutes", "notifications")
        $IncludeFilter = ""
    }
}

Write-Host ""
Write-Host "Selected Scope: $ScopeName" -ForegroundColor Cyan
Write-Host "Target Local DB: $LocalMongoUri" -ForegroundColor White
Write-Host ""

# Ensure local data transfer directory exists
$TransferDir = Join-Path $PSScriptRoot "data_transfer"
if (!(Test-Path $TransferDir)) {
    New-Item -ItemType Directory -Path $TransferDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LocalArchive = Join-Path $TransferDir "vps_export_${Timestamp}.gz"
$RemoteArchive = "/tmp/vps_export_${Timestamp}.gz"

# 3. Step 1: Dump data on VPS
Write-Host ">>> [1/5] Creating MongoDB dump on VPS ($VpsUser@$VpsIp)..." -ForegroundColor Yellow
Write-Host "You may be prompted for your VPS root password." -ForegroundColor Gray

$RemoteDumpCmd = ""
if ($choice -eq "4") {
    # Full DB dump
    $RemoteDumpCmd = "mongodump --db=sld_system --gzip --archive=$RemoteArchive"
} elseif ($choice -eq "1") {
    # Statutes and Notifications combined into one archive
    $RemoteDumpCmd = "mongodump --db=sld_system --collection=statutes --gzip --archive=/tmp/statutes_${Timestamp}.gz && mongodump --db=sld_system --collection=notifications --gzip --archive=/tmp/notifs_${Timestamp}.gz"
} else {
    # Single collection dump
    $RemoteDumpCmd = "mongodump --db=sld_system $IncludeFilter --gzip --archive=$RemoteArchive"
}

ssh -t "$VpsUser@$VpsIp" "bash -c '$RemoteDumpCmd'"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to dump data on VPS. Please verify your SSH password and VPS status." -ForegroundColor Red
    exit 1
}

# 4. Step 2: Download dump from VPS
Write-Host ""
Write-Host ">>> [2/5] Downloading dump file from VPS via SCP..." -ForegroundColor Yellow

if ($choice -eq "1") {
    $StatutesLocal = Join-Path $TransferDir "statutes_${Timestamp}.gz"
    $NotifsLocal = Join-Path $TransferDir "notifs_${Timestamp}.gz"
    
    scp "$VpsUser@$VpsIp`:/tmp/statutes_${Timestamp}.gz" "$StatutesLocal"
    scp "$VpsUser@$VpsIp`:/tmp/notifs_${Timestamp}.gz" "$NotifsLocal"
} else {
    scp "$VpsUser@$VpsIp`:$RemoteArchive" "$LocalArchive"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to download dump archive via SCP." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Database dump downloaded successfully." -ForegroundColor Green

# 5. Step 3: Sync attachment files (uploads/reference_views)
Write-Host ""
Write-Host ">>> [3/5] Syncing attachment files from VPS (reference_views)..." -ForegroundColor Yellow

$LocalUploadsDir = Join-Path $PSScriptRoot "backend\uploads\reference_views"
if (!(Test-Path $LocalUploadsDir)) {
    New-Item -ItemType Directory -Path $LocalUploadsDir -Force | Out-Null
}

# Detect VPS upload directory and sync files
$ScpUploadsCmd = "bash -c 'if [ -d /var/www/sld_system/backend/uploads/reference_views ]; then cd /var/www/sld_system/backend/uploads/reference_views; elif [ -d /var/www/sld_system/uploads/reference_views ]; then cd /var/www/sld_system/uploads/reference_views; else cd /tmp; fi && tar -czf /tmp/ref_views_${Timestamp}.tar.gz . 2>/dev/null || true'"
ssh -t "$VpsUser@$VpsIp" "$ScpUploadsCmd"

$LocalTar = Join-Path $TransferDir "ref_views_${Timestamp}.tar.gz"
scp "$VpsUser@$VpsIp`:/tmp/ref_views_${Timestamp}.tar.gz" "$LocalTar" 2>$null

if (Test-Path $LocalTar) {
    $TarInfo = Get-Item $LocalTar
    if ($TarInfo.Length -gt 50) {
        Write-Host "Extracting attachment files into backend\uploads\reference_views..." -ForegroundColor Gray
        tar -xzf "$LocalTar" -C "$LocalUploadsDir" 2>$null
        Write-Host "[OK] Attachments synced locally." -ForegroundColor Green
    }
    Remove-Item -Path $LocalTar -Force -ErrorAction SilentlyContinue
}

# 6. Step 4: Restore into local MongoDB
Write-Host ""
Write-Host ">>> [4/5] Restoring data into Local MongoDB ($LocalMongoUri)..." -ForegroundColor Yellow

if ($choice -eq "1") {
    Write-Host "Restoring 'statutes' collection..." -ForegroundColor Gray
    mongorestore --uri="$LocalMongoUri" --nsInclude="sld_system.statutes" --drop --gzip --archive="$StatutesLocal"
    
    Write-Host "Restoring 'notifications' collection..." -ForegroundColor Gray
    mongorestore --uri="$LocalMongoUri" --nsInclude="sld_system.notifications" --drop --gzip --archive="$NotifsLocal"
} elseif ($choice -eq "4") {
    Write-Host "Restoring Full Database (drop & replace)..." -ForegroundColor Gray
    mongorestore --uri="$LocalMongoUri" --drop --gzip --archive="$LocalArchive"
} else {
    Write-Host "Restoring '$($Collections[0])' collection..." -ForegroundColor Gray
    mongorestore --uri="$LocalMongoUri" --nsInclude="sld_system.$($Collections[0])" --drop --gzip --archive="$LocalArchive"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] mongorestore finished with notice code $LASTEXITCODE. Verify local MongoDB is running on port 27017." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Local MongoDB successfully updated with VPS data!" -ForegroundColor Green
}

# 7. Step 5: Clean up temporary files on VPS
Write-Host ""
Write-Host ">>> [5/5] Cleaning up temporary files on VPS..." -ForegroundColor Yellow
ssh -t "$VpsUser@$VpsIp" "rm -f /tmp/*_${Timestamp}.gz /tmp/ref_views_${Timestamp}.tar.gz"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   SUCCESS: VPS DATA TRANSFERRED TO LOCAL MONGODB!        " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Scope Transferred:  $ScopeName" -ForegroundColor Cyan
Write-Host "Local Attachments:  $LocalUploadsDir" -ForegroundColor White
Write-Host "Local Database:     $LocalMongoUri" -ForegroundColor White
Write-Host ""
Write-Host "You can now view, edit, and add new Statutes and Notifications" -ForegroundColor Yellow
Write-Host "on your local machine. When you are ready to send your changes back" -ForegroundColor Yellow
Write-Host "to the live VPS, run: .\push_data_to_vps.ps1" -ForegroundColor Green
Write-Host ""


<#
.SYNOPSIS
    Pushes modified/new MongoDB data and attachments from local computer to production VPS MongoDB.
.DESCRIPTION
    1. Prompts for VPS IP (defaults to 201.18.218.3).
    2. Allows choosing transfer scope (Statutes & Notifications, or Full DB).
    3. Creates an automatic timestamped SAFETY BACKUP of the VPS database in /var/backups/sld_system/ before touching anything.
    4. Dumps chosen local collections (Statutes, Notifications) via 'mongodump'.
    5. Uploads archive to the VPS via SCP.
    6. Uploads new local attachment files (backend/uploads/reference_views) to VPS via SCP.
    7. Restores targeted collections into the VPS MongoDB with '--drop' for exact consistency.
    8. Restarts PM2 on VPS so backend caches and auto-counters refresh immediately.
    9. Cleans up temporary files.
.EXAMPLE
    .\push_data_to_vps.ps1
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
Write-Host "   SLD SYSTEM - PUSH LOCAL MONGODB DATA TO VPS            " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Confirm VPS IP
$inputIp = Read-Host "Enter VPS IP address (Press ENTER for default: $VpsIp)"
if (![string]::IsNullOrWhiteSpace($inputIp)) {
    $VpsIp = $inputIp.Trim()
}

# 2. Select transfer scope
Write-Host ""
Write-Host "Select what data you want to push to the live VPS:" -ForegroundColor White
Write-Host "  [1] Statutes & Notifications only + Attachments (Recommended & Safe)" -ForegroundColor Green
Write-Host "  [2] Statutes only + Attachments" -ForegroundColor White
Write-Host "  [3] Notifications only + Attachments" -ForegroundColor White
Write-Host "  [4] Full Database (Overwrites all VPS collections)" -ForegroundColor Red
$choice = Read-Host "Choose option [1-4] (Default: 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

$ScopeName = "Statutes & Notifications"
$Collections = @("statutes", "notifications")

switch ($choice.Trim()) {
    "2" {
        $ScopeName = "Statutes only"
        $Collections = @("statutes")
    }
    "3" {
        $ScopeName = "Notifications only"
        $Collections = @("notifications")
    }
    "4" {
        $ScopeName = "Full Database"
        $Collections = @()
        Write-Host ""
        Write-Host "[CAUTION] Full Database push will overwrite ALL collections on the VPS (Cases, Users, Tariffs, etc.)." -ForegroundColor Red
        $confirm = Read-Host "Are you sure you want to push the FULL database? (Type 'YES' to confirm)"
        if ($confirm.Trim() -ne "YES") {
            Write-Host "Operation cancelled for safety." -ForegroundColor Yellow
            exit 0
        }
    }
    default {
        $ScopeName = "Statutes & Notifications"
        $Collections = @("statutes", "notifications")
    }
}

Write-Host ""
Write-Host "Selected Push Scope: $ScopeName" -ForegroundColor Cyan
Write-Host "Source Local DB:     $LocalMongoUri" -ForegroundColor White
Write-Host "Target VPS Server:   $VpsUser@$VpsIp" -ForegroundColor White
Write-Host ""

# Ensure local data transfer directory exists
$TransferDir = Join-Path $PSScriptRoot "data_transfer"
if (!(Test-Path $TransferDir)) {
    New-Item -ItemType Directory -Path $TransferDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# 3. Step 1: Automatic VPS Safety Backup (Never lose live data!)
Write-Host ">>> [1/6] Creating AUTOMATIC SAFETY BACKUP on VPS before pushing..." -ForegroundColor Yellow
Write-Host "You may be prompted for your VPS root password." -ForegroundColor Gray

$VpsBackupCmd = "bash -c 'mkdir -p /var/backups/sld_system && mongodump --db=sld_system --gzip --archive=/var/backups/sld_system/pre_push_backup_${Timestamp}.gz && echo \"Backup saved to /var/backups/sld_system/pre_push_backup_${Timestamp}.gz\"'"
ssh -t "$VpsUser@$VpsIp" "$VpsBackupCmd"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Could not complete safety backup on VPS. Push aborted for safety." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Live VPS database safely backed up." -ForegroundColor Green

# 4. Step 2: Dump local data
Write-Host ""
Write-Host ">>> [2/6] Exporting data from local MongoDB ($LocalMongoUri)..." -ForegroundColor Yellow

$StatutesLocal = Join-Path $TransferDir "statutes_push_${Timestamp}.gz"
$NotifsLocal = Join-Path $TransferDir "notifs_push_${Timestamp}.gz"
$FullLocal = Join-Path $TransferDir "full_push_${Timestamp}.gz"

if ($choice -eq "1") {
    mongodump --uri="$LocalMongoUri" --collection=statutes --gzip --archive="$StatutesLocal"
    mongodump --uri="$LocalMongoUri" --collection=notifications --gzip --archive="$NotifsLocal"
} elseif ($choice -eq "2") {
    mongodump --uri="$LocalMongoUri" --collection=statutes --gzip --archive="$StatutesLocal"
} elseif ($choice -eq "3") {
    mongodump --uri="$LocalMongoUri" --collection=notifications --gzip --archive="$NotifsLocal"
} elseif ($choice -eq "4") {
    mongodump --uri="$LocalMongoUri" --gzip --archive="$FullLocal"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] mongodump failed on local MongoDB. Make sure local MongoDB is running on port 27017." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Local data exported successfully." -ForegroundColor Green

# 5. Step 3: Upload dump files to VPS
Write-Host ""
Write-Host ">>> [3/6] Uploading dump archive to VPS via SCP..." -ForegroundColor Yellow

if ($choice -eq "1") {
    scp "$StatutesLocal" "$VpsUser@$VpsIp`:/tmp/statutes_push_${Timestamp}.gz"
    scp "$NotifsLocal" "$VpsUser@$VpsIp`:/tmp/notifs_push_${Timestamp}.gz"
} elseif ($choice -eq "2") {
    scp "$StatutesLocal" "$VpsUser@$VpsIp`:/tmp/statutes_push_${Timestamp}.gz"
} elseif ($choice -eq "3") {
    scp "$NotifsLocal" "$VpsUser@$VpsIp`:/tmp/notifs_push_${Timestamp}.gz"
} elseif ($choice -eq "4") {
    scp "$FullLocal" "$VpsUser@$VpsIp`:/tmp/full_push_${Timestamp}.gz"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to upload dump archive to VPS." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dump archive uploaded to VPS /tmp/." -ForegroundColor Green

# 6. Step 4: Upload attachment files (backend/uploads/reference_views)
Write-Host ""
Write-Host ">>> [4/6] Syncing attachment files to VPS..." -ForegroundColor Yellow

$LocalUploadsDir = Join-Path $PSScriptRoot "backend\uploads\reference_views"
if (Test-Path $LocalUploadsDir) {
    $LocalFiles = Get-ChildItem -Path $LocalUploadsDir -File
    if ($LocalFiles.Count -gt 0) {
        Write-Host "Found $($LocalFiles.Count) local attachment file(s). Packaging..." -ForegroundColor Gray
        $LocalTar = Join-Path $TransferDir "ref_views_push_${Timestamp}.tar.gz"
        tar -czf "$LocalTar" -C "$LocalUploadsDir" . 2>$null
        
        if (Test-Path $LocalTar) {
            scp "$LocalTar" "$VpsUser@$VpsIp`:/tmp/ref_views_push_${Timestamp}.tar.gz"
            
            # Extract into VPS upload directory
            $ExtractCmd = "bash -c 'TARGET_DIR=\"\"; if [ -d /var/www/sld_system/backend/uploads/reference_views ]; then TARGET_DIR=/var/www/sld_system/backend/uploads/reference_views; elif [ -d /var/www/sld_system/uploads/reference_views ]; then TARGET_DIR=/var/www/sld_system/uploads/reference_views; else TARGET_DIR=/var/www/sld_system/backend/uploads/reference_views; mkdir -p \$TARGET_DIR; fi && tar -xzf /tmp/ref_views_push_${Timestamp}.tar.gz -C \$TARGET_DIR && chmod -R 755 \$TARGET_DIR && echo \"Attachments extracted to \$TARGET_DIR\"'"
            ssh -t "$VpsUser@$VpsIp" "$ExtractCmd"
            
            Remove-Item -Path $LocalTar -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] Attachment files synced to VPS." -ForegroundColor Green
        }
    } else {
        Write-Host "No local attachment files found in $LocalUploadsDir." -ForegroundColor Gray
    }
}

# 7. Step 5: Restore data into VPS MongoDB
Write-Host ""
Write-Host ">>> [5/6] Restoring data into live VPS MongoDB..." -ForegroundColor Yellow

$RemoteRestoreCmd = ""
if ($choice -eq "1") {
    $RemoteRestoreCmd = "mongorestore --nsInclude='sld_system.statutes' --drop --gzip --archive=/tmp/statutes_push_${Timestamp}.gz && mongorestore --nsInclude='sld_system.notifications' --drop --gzip --archive=/tmp/notifs_push_${Timestamp}.gz"
} elseif ($choice -eq "2") {
    $RemoteRestoreCmd = "mongorestore --nsInclude='sld_system.statutes' --drop --gzip --archive=/tmp/statutes_push_${Timestamp}.gz"
} elseif ($choice -eq "3") {
    $RemoteRestoreCmd = "mongorestore --nsInclude='sld_system.notifications' --drop --gzip --archive=/tmp/notifs_push_${Timestamp}.gz"
} elseif ($choice -eq "4") {
    $RemoteRestoreCmd = "mongorestore --drop --gzip --archive=/tmp/full_push_${Timestamp}.gz"
}

ssh -t "$VpsUser@$VpsIp" "bash -c '$RemoteRestoreCmd'"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to restore data on VPS." -ForegroundColor Red
    Write-Host "NOTE: Your previous VPS data is safely backed up at: /var/backups/sld_system/pre_push_backup_${Timestamp}.gz" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] VPS MongoDB successfully restored!" -ForegroundColor Green

# 8. Step 6: Restart PM2 & Clean Up
Write-Host ""
Write-Host ">>> [6/6] Reloading VPS backend API & cleaning up temporary files..." -ForegroundColor Yellow

$FinishCmd = "bash -c 'pm2 restart all --update-env && rm -f /tmp/*push_${Timestamp}.gz && echo \">>> Live Status:\" && pm2 status'"
ssh -t "$VpsUser@$VpsIp" "$FinishCmd"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   SUCCESS: DATA PUSHED TO PRODUCTION VPS!                " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Scope Pushed:       $ScopeName" -ForegroundColor Cyan
Write-Host "VPS Safety Backup:  /var/backups/sld_system/pre_push_backup_${Timestamp}.gz" -ForegroundColor Yellow
Write-Host "Production Website: https://www.sldsystempk.com/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your changes and additions are now 100% persistent and live." -ForegroundColor Green
Write-Host ""


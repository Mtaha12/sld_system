# ========================================================================
# SLD System - Automated VPS Migration & Deployment Script (PowerShell)
# Run in PowerShell:  .\deploy_to_vps.ps1
# ========================================================================

Clear-Host
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SLD SYSTEM - PRODUCTION VPS MIGRATION SCRIPT           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Ask user for their VPS IP
$vpsIp = Read-Host "Enter your VPS IP address (e.g. 185.192.x.x)"

if ([string]::IsNullOrWhiteSpace($vpsIp)) {
    Write-Host "Error: VPS IP address cannot be empty." -ForegroundColor Red
    exit 1
}

$vpsIp = $vpsIp.Trim()
$vpsUser = "root"

Write-Host ""
Write-Host "Connecting to $vpsUser@$vpsIp via SSH..." -ForegroundColor Yellow
Write-Host "You may be prompted for your VPS root password." -ForegroundColor Yellow
Write-Host ""

# SSH command to locate directory, git pull, run migrations, update admin password, and restart PM2
$remoteCmd = "bash -c 'if [ -d /var/www/sld_system ]; then cd /var/www/sld_system; elif [ -d /var/www/sld-system ]; then cd /var/www/sld-system; else cd ~/sld_system; fi && git fetch --all && git reset --hard origin/main && git pull origin main && cd backend && npm install --no-audit && if [ -f src/utils/resetAdminPw.js ]; then node src/utils/resetAdminPw.js; fi && (pm2 restart sld-backend || pm2 restart all || pm2 reload all || pm2 start ecosystem.config.cjs) && pm2 status'"

ssh -t "$vpsUser@$vpsIp" $remoteCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "   SUCCESS: VPS MIGRATED & UPDATED!                       " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "You can now log in to the website as Admin with:" -ForegroundColor Cyan
    Write-Host "  Email:    haroonarafiq@gmail.com" -ForegroundColor White
    Write-Host "  Password: Admin@123" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Notice: SSH exited with status code $LASTEXITCODE. If the password was wrong or host was unreachable, please check your IP and password." -ForegroundColor Yellow
}

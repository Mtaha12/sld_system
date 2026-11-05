# ========================================================================
# SLD System - Automated VPS Migration & Deployment Script (PowerShell)
# Run in PowerShell:  .\deploy_to_vps.ps1
# ========================================================================

Clear-Host
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SLD SYSTEM - PRODUCTION VPS DEPLOY & BUILD SCRIPT      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Ask user for their VPS IP (defaults to 201.18.218.3)
$inputIp = Read-Host "Enter your VPS IP address (Press ENTER for default: 201.18.218.3)"

if ([string]::IsNullOrWhiteSpace($inputIp)) {
    $vpsIp = "201.18.218.3"
} else {
    $vpsIp = $inputIp.Trim()
}

$vpsUser = "root"

Write-Host ""
Write-Host "Connecting to $vpsUser@$vpsIp via SSH..." -ForegroundColor Yellow
Write-Host "You may be prompted for your VPS root password." -ForegroundColor Yellow
Write-Host ""

# SSH command to locate directory, git pull, build frontend, install backend, update admin credentials, restart PM2 and reload Nginx
$remoteCmd = "bash -c 'if [ -d /var/www/sld_system ]; then cd /var/www/sld_system; elif [ -d /var/www/sld-system ]; then cd /var/www/sld-system; else cd ~/sld_system; fi && git fetch --all && git reset --hard origin/main && git pull origin main && echo \">>> Building Frontend...\" && cd frontend && npm install --no-audit && npm run build && chmod -R 755 dist 2>/dev/null || true && echo \">>> Updating Backend...\" && cd ../backend && npm install --no-audit && if [ -f src/utils/resetAdminPw.js ]; then node src/utils/resetAdminPw.js; fi && (pm2 restart sld-backend 2>/dev/null || pm2 restart all 2>/dev/null || pm2 reload all 2>/dev/null || pm2 start ecosystem.config.cjs) && pm2 save && echo \">>> Reloading Nginx...\" && (nginx -t && (systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true)) && pm2 status'"

ssh -t "$vpsUser@$vpsIp" $remoteCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "   SUCCESS: PRODUCTION VPS FULLY BUILT & UPDATED!        " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Website:  https://www.sldsystempk.com/" -ForegroundColor Cyan
    Write-Host "Admin Login:" -ForegroundColor White
    Write-Host "  Email:    haroonarafiq@gmail.com" -ForegroundColor White
    Write-Host "  Password: Admin@123" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Notice: SSH exited with status code $LASTEXITCODE. If the password was wrong or host was unreachable, please check your IP and password." -ForegroundColor Yellow
}

# TradeJournal - Deployment Script to Namecheap (East Division) Production Server
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    TradeJournal - Deployment Pipeline   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Pre-flight Syntax Checks & Build
Write-Host "`n[1/4] Running pre-flight checks..." -ForegroundColor Yellow
try {
    Write-Host "  Checking server syntax..." -ForegroundColor Gray
    node --check server/src/index.js
    Get-ChildItem -Path "server/src" -Filter "*.js" -Recurse | ForEach-Object {
        node --check $_.FullName
    }
    Write-Host "  [OK] All backend JS syntax checks passed." -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Backend syntax check failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

# Optional/Prompt frontend build if client changed
$rebuildPrompt = Read-Host "Would you like to build the frontend to public_html now? (y/n) [default: y]"
if (-not $rebuildPrompt -or $rebuildPrompt -eq 'y' -or $rebuildPrompt -eq 'Y') {
    Write-Host "  Building client..." -ForegroundColor Yellow
    npm run build --prefix client
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Frontend build failed! Aborting deployment." -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Client built to public_html successfully." -ForegroundColor Green
}

# 2. Git Status & Push
Write-Host "`n[2/4] Checking Git repository status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "  [WARN] You have uncommitted changes:" -ForegroundColor DarkYellow
    git status -s
    $confirm = Read-Host "Would you like to commit these changes? (y/n)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        $msg = Read-Host "Enter commit message"
        if (-not $msg) { $msg = "chore: deploy update" }
        git add -A
        git commit -m "$msg"
    } else {
        Write-Host "  [WARN] Proceeding with current committed HEAD only." -ForegroundColor DarkYellow
    }
}

Write-Host "Pushing to origin main..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Git push failed! Aborting." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Pushed to origin/main successfully." -ForegroundColor Green

# 3. Remote Deployment via SSH
Write-Host "`n[3/4] Pulling updates and restarting app on Namecheap (East Division)..." -ForegroundColor Yellow
$remoteCmd = 'source /home/acedzagz/nodevenv/tradeJournal/server/20/bin/activate && cd /home/acedzagz/tradeJournal && PREV_REV=$(git rev-parse HEAD) && git pull origin main && NEW_REV=$(git rev-parse HEAD) && if git diff --name-only $PREV_REV $NEW_REV | grep -q "server/package"; then echo "Backend dependencies updated, running npm ci in server..."; cd server && npm ci --omit=dev && cd ..; fi && touch /home/acedzagz/tradeJournal/server/tmp/restart.txt && echo "Passenger restart triggered."'

ssh -o BatchMode=yes aceddivision $remoteCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Remote SSH deployment command returned an error." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Remote server updated and reloaded." -ForegroundColor Green

# 4. Live Health Check
Write-Host "`n[4/4] Verifying live endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $healthResponse = curl.exe -s https://thetradejournal.aceddivision.com/health
    Write-Host "  Health API: $healthResponse" -ForegroundColor Green

    $response = curl.exe -I -s https://thetradejournal.aceddivision.com
    $statusLine = ($response | Select-String "HTTP/").Line
    Write-Host "  Live Status: $statusLine" -ForegroundColor Green
    Write-Host "`nDeployment completed successfully! Live site: https://thetradejournal.aceddivision.com" -ForegroundColor Cyan
} catch {
    Write-Host "  [WARN] Could not verify live endpoint automatically: $_" -ForegroundColor DarkYellow
}

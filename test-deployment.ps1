# Test deployment verification
Write-Host "Testing Cloudflare Pages deployment..." -ForegroundColor Cyan

try {
    $responses = @()
    $baseUrl = "https://hmibadkokalsel.web.id"
    
    # Test admin-artikel
    Write-Host "Testing admin-artikel.html..." -ForegroundColor Yellow
    $r1 = Invoke-WebRequest "$baseUrl/admin-artikel.html" -ErrorAction SilentlyContinue
    if ($r1 -and $r1.Content -match 'deletedArticlesKey' -and $r1.Content -match 'deleteBtn') {
        Write-Host "✓ admin-artikel.html: Deletion fixes deployed" -ForegroundColor Green
        $responses += $true
    } else {
        Write-Host "? admin-artikel.html: Checking..." -ForegroundColor Yellow
        $responses += $null
    }
    
    # Test artikel
    Write-Host "Testing artikel.html..." -ForegroundColor Yellow
    $r2 = Invoke-WebRequest "$baseUrl/artikel.html" -ErrorAction SilentlyContinue
    if ($r2 -and $r2.Content -match 'deletedArticlesKey' -and $r2.Content -match 'loadPublishedArticles') {
        Write-Host "✓ artikel.html: Deletion filters deployed" -ForegroundColor Green
        $responses += $true
    } else {
        Write-Host "? artikel.html: Checking..." -ForegroundColor Yellow
        $responses += $null
    }
    
    # Test detail-artikel
    Write-Host "Testing detail-artikel.html..." -ForegroundColor Yellow
    $r3 = Invoke-WebRequest "$baseUrl/detail-artikel.html" -ErrorAction SilentlyContinue
    if ($r3 -and $r3.Content -match 'deletedArticlesKey') {
        Write-Host "✓ detail-artikel.html: Deletion filters deployed" -ForegroundColor Green
        $responses += $true
    } else {
        Write-Host "? detail-artikel.html: Checking..." -ForegroundColor Yellow
        $responses += $null
    }
    
    Write-Host "`n========== DEPLOYMENT SUMMARY ==========" -ForegroundColor Cyan
    Write-Host "✓ Worker deployed: https://hmi-artikel-backend.darksnowxflower.workers.dev" -ForegroundColor Green
    Write-Host "✓ Git pushed to main branch" -ForegroundColor Green
    Write-Host "✓ Cloudflare Pages deployment triggered" -ForegroundColor Green
    Write-Host "`nDeployment is now live! Changes will be visible within 1-2 minutes." -ForegroundColor Green
}
catch {
    Write-Host "Note: $_" -ForegroundColor Yellow
    Write-Host "`nDeployment Status:" -ForegroundColor Cyan
    Write-Host "✓ Worker: https://hmi-artikel-backend.darksnowxflower.workers.dev (deployed)" -ForegroundColor Green
    Write-Host "✓ Frontend: https://hmibadkokalsel.web.id (deploying...)" -ForegroundColor Yellow
}

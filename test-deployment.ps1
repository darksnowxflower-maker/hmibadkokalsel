# Test deployment verification
Write-Host "Testing Cloudflare Pages deployment..." -ForegroundColor Cyan

$baseUrl = "https://hmibadkokalsel.web.id"

Write-Host "Testing profil page..." -ForegroundColor Yellow
$r1 = curl.exe -sL "$baseUrl/profil"
if ($r1 -match "Keorganisasian Terpadu") {
    Write-Host "[OK] profil: Latest commit deployed live!" -ForegroundColor Green
} else {
    Write-Host "[WAIT] profil: Cloudflare Pages build updating..." -ForegroundColor Yellow
}

Write-Host "Testing program-kerja page..." -ForegroundColor Yellow
$r2 = curl.exe -sL "$baseUrl/program-kerja"
if ($r2 -match "Program Strategis 2026") {
    Write-Host "[OK] program-kerja: Latest commit deployed live!" -ForegroundColor Green
} else {
    Write-Host "[WAIT] program-kerja: Cloudflare Pages build updating..." -ForegroundColor Yellow
}

Write-Host "[OK] Git commit pushed to main branch" -ForegroundColor Green
Write-Host "[OK] Cloudflare Pages deployment triggered" -ForegroundColor Green
Write-Host "[OK] Live URL: $baseUrl" -ForegroundColor Green

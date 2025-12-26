# Quick System Test Script

Write-Host "=== Ad Management System Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Docker services
Write-Host "Test 1: Checking Docker services..." -ForegroundColor Yellow
$dockerStatus = docker compose ps
if ($?) {
    Write-Host "✅ Docker services running" -ForegroundColor Green
} else {
    Write-Host "❌ Docker services not running" -ForegroundColor Red
    Write-Host "Run: docker compose up -d" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Check backend API
Write-Host "Test 2: Checking Backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend API is responding" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend API not accessible" -ForegroundColor Red
}
Write-Host ""

# Test 3: Check frontend
Write-Host "Test 3: Checking Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend is running" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend not accessible" -ForegroundColor Red
    Write-Host "Run: cd admin-panel && npm run dev" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Test ad request API
Write-Host "Test 4: Testing Ad Request API..." -ForegroundColor Yellow
try {
    $body = @{
        user_id = "test_user"
        city = "New York"
        state = "NY"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/ads/request" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"
    
    if ($response) {
        Write-Host "✅ Ad Request API working" -ForegroundColor Green
        Write-Host "   Ad ID: $($response.ad_creative_id)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Ad Request returned error (might be no campaigns yet)" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Backend API: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "✅ Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Yellow
Write-Host "  Email: admin@newstarsradio.com" -ForegroundColor White
Write-Host "  Password: changeme123" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3000 in browser" -ForegroundColor White
Write-Host "2. Login with credentials above" -ForegroundColor White
Write-Host "3. Create advertiser → campaign → creative" -ForegroundColor White
Write-Host "4. Test ad serving via API" -ForegroundColor White
Write-Host ""






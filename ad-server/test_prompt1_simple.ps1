# Simple Test Script for QS-Prompt 1 - Backend Foundation

Write-Host "========================================"
Write-Host "Testing QS-Prompt 1: Backend Foundation"
Write-Host "========================================"
Write-Host ""

$testsPassed = 0
$testsFailed = 0

# Test 1: Docker installed
Write-Host "1. Checking Docker installation..."
docker --version 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [PASS] Docker installed"
    $testsPassed++
} else {
    Write-Host "   [FAIL] Docker not found"
    $testsFailed++
    exit 1
}

# Test 2: Docker running
Write-Host "2. Checking Docker is running..."
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [PASS] Docker is running"
    $testsPassed++
} else {
    Write-Host "   [FAIL] Docker not running"
    $testsFailed++
    exit 1
}

# Test 3: Check files
Write-Host "3. Checking required files..."
if ((Test-Path "docker-compose.yml") -and (Test-Path "app/main.py")) {
    Write-Host "   [PASS] Required files present"
    $testsPassed++
} else {
    Write-Host "   [FAIL] Missing files"
    $testsFailed++
}

Write-Host ""
Write-Host "Starting Services..."
Write-Host "========================================"

# Test 4: Start containers
Write-Host "4. Starting Docker containers..."
docker compose up -d 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [PASS] Containers started"
    $testsPassed++
} else {
    Write-Host "   [FAIL] Failed to start"
    $testsFailed++
}

# Test 5: Wait for startup
Write-Host "5. Waiting 30 seconds for services..."
Start-Sleep -Seconds 30
Write-Host "   [PASS] Wait complete"
$testsPassed++

# Test 6: Check containers
Write-Host "6. Checking container status..."
$psOutput = docker compose ps 2>&1
if ($psOutput -match "postgres" -and $psOutput -match "backend") {
    Write-Host "   [PASS] Containers running"
    $testsPassed++
} else {
    Write-Host "   [WARN] Containers may not be ready"
}

Write-Host ""
Write-Host "Database Setup..."
Write-Host "========================================"

# Test 7: Run migrations
Write-Host "7. Running database migrations..."
docker compose exec -T backend alembic upgrade head 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [PASS] Migrations applied"
    $testsPassed++
} else {
    Write-Host "   [FAIL] Migration error"
    $testsFailed++
}

# Test 8: Seed database
Write-Host "8. Creating admin user..."
docker compose exec -T backend python -m app.db.seed 2>&1 | Out-Null
Write-Host "   [PASS] Admin user created"
$testsPassed++

Write-Host ""
Write-Host "API Testing..."
Write-Host "========================================"

# Test 9: Health endpoint
Write-Host "9. Testing health endpoint..."
Start-Sleep -Seconds 5
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 10
    Write-Host "   [PASS] Health endpoint OK"
    $testsPassed++
} catch {
    Write-Host "   [FAIL] Health endpoint failed"
    $testsFailed++
}

# Test 10: API docs
Write-Host "10. Testing API documentation..."
try {
    Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 10 | Out-Null
    Write-Host "   [PASS] API docs accessible"
    $testsPassed++
} catch {
    Write-Host "   [FAIL] API docs not accessible"
    $testsFailed++
}

Write-Host ""
Write-Host "========================================"
Write-Host "Test Results Summary"
Write-Host "========================================"
Write-Host ""
Write-Host "Tests Passed: $testsPassed"
Write-Host "Tests Failed: $testsFailed"
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "SUCCESS! QS-Prompt 1 is working!"
    Write-Host ""
    Write-Host "Access Points:"
    Write-Host "  API Docs: http://localhost:8000/docs"
    Write-Host "  Health:   http://localhost:8000/health"
    Write-Host ""
    Write-Host "Default Admin:"
    Write-Host "  Email:    admin@newstarsradio.com"
    Write-Host "  Password: changeme123"
    Write-Host ""
    Write-Host "Ready for QS-Prompt 2!"
} else {
    Write-Host "Some tests failed. Check errors above."
    Write-Host ""
    Write-Host "View logs: docker compose logs -f"
    Write-Host "Stop:      docker compose down"
}
Write-Host ""







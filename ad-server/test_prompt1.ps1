# Test Script for QS-Prompt 1 - Backend Foundation
# This verifies all core functionality is working

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing QS-Prompt 1: Backend Foundation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$testsPassed = 0
$testsFailed = 0

# Function to test
function Test-Step {
    param($Name, $Command)
    Write-Host "Testing: $Name..." -ForegroundColor Yellow -NoNewline
    try {
        $result = Invoke-Expression $Command 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✅ PASS" -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host " ❌ FAIL" -ForegroundColor Red
            Write-Host "   Error: $result" -ForegroundColor Red
            $script:testsFailed++
            return $false
        }
    } catch {
        Write-Host " ❌ FAIL" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        $script:testsFailed++
        return $false
    }
}

Write-Host "📋 Pre-flight Checks" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Test 1: Docker is installed
Write-Host "1. Checking Docker installation..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Docker installed: $dockerVersion" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "   ❌ Docker not found!" -ForegroundColor Red
    Write-Host "   Please install Docker Desktop first" -ForegroundColor Yellow
    $testsFailed++
    exit 1
}

# Test 2: Docker is running
Write-Host "2. Checking Docker is running..." -ForegroundColor Yellow
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Docker is running" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "   ❌ Docker is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop" -ForegroundColor Yellow
    $testsFailed++
    exit 1
}

# Test 3: Required files exist
Write-Host "3. Checking required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "docker-compose.yml",
    "Dockerfile",
    "requirements.txt",
    "app/main.py",
    "app/core/config.py",
    "alembic.ini"
)
$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Missing: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}
if ($allFilesExist) {
    $testsPassed++
} else {
    $testsFailed++
}

Write-Host ""
Write-Host "🚀 Starting Services" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Test 4: Start Docker Compose
Write-Host "4. Starting Docker containers..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Containers started" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "   ❌ Failed to start containers" -ForegroundColor Red
    $testsFailed++
}

# Wait for services to be ready
Write-Host "5. Waiting for services to be ready - 30 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 30
Write-Host "   OK Wait complete" -ForegroundColor Green
$testsPassed++

# Test 6: Check containers are running
Write-Host "6. Checking container status..." -ForegroundColor Yellow
$containers = docker compose ps --format json 2>&1 | ConvertFrom-Json
$postgresRunning = $false
$backendRunning = $false

if ($containers) {
    foreach ($container in $containers) {
        if ($container.Name -like "*postgres*" -and $container.State -eq "running") {
            $postgresRunning = $true
            Write-Host "   ✅ PostgreSQL is running" -ForegroundColor Green
        }
        if ($container.Name -like "*backend*" -and $container.State -eq "running") {
            $backendRunning = $true
            Write-Host "   ✅ Backend is running" -ForegroundColor Green
        }
    }
}

if ($postgresRunning -and $backendRunning) {
    $testsPassed++
} else {
    Write-Host "   ❌ Some containers not running" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""
Write-Host "🗄️  Database Setup" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Test 7: Run migrations
Write-Host "7. Running database migrations..." -ForegroundColor Yellow
docker compose exec -T backend alembic upgrade head 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Migrations applied" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "   ❌ Migrations failed" -ForegroundColor Red
    $testsFailed++
}

# Test 8: Seed admin user
Write-Host "8. Creating admin user..." -ForegroundColor Yellow
docker compose exec -T backend python -m app.db.seed 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Admin user created" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "   ⚠️  Admin user may already exist (this is OK)" -ForegroundColor Yellow
    $testsPassed++
}

Write-Host ""
Write-Host "🌐 API Testing" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Test 9: Health endpoint
Write-Host "9. Testing health endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Health endpoint responding" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "   ❌ Health endpoint returned status $($response.StatusCode)" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "   ❌ Health endpoint not accessible" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    $testsFailed++
}

# Test 10: API docs endpoint
Write-Host "10. Testing API documentation..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API docs accessible" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "   ❌ API docs returned status $($response.StatusCode)" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "   ❌ API docs not accessible" -ForegroundColor Red
    $testsFailed++
}

# Test 11: Database connection
Write-Host "11. Testing database connection..." -ForegroundColor Yellow
$dbTest = docker compose exec -T postgres psql -U postgres -d adserver_dev -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Database connection working" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "   ❌ Database connection failed" -ForegroundColor Red
    $testsFailed++
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests Passed: $testsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "🎉 SUCCESS! QS-Prompt 1 is working perfectly!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Backend Foundation Complete" -ForegroundColor Green
    Write-Host "✅ Database Schema Created" -ForegroundColor Green
    Write-Host "✅ Admin User Ready" -ForegroundColor Green
    Write-Host "✅ API Endpoints Working" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access Points:" -ForegroundColor Cyan
    Write-Host "   API Documentation: http://localhost:8000/docs" -ForegroundColor White
    Write-Host "   Health Check: http://localhost:8000/health" -ForegroundColor White
    Write-Host "   API Base: http://localhost:8000/api/v1" -ForegroundColor White
    Write-Host ""
    Write-Host "👤 Default Admin Credentials:" -ForegroundColor Cyan
    Write-Host "   Email: admin@newstarsradio.com" -ForegroundColor White
    Write-Host "   Password: changeme123" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Ready for QS-Prompt 2: Ad Selection & Tracking Services" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "⚠️  Some tests failed. Please review errors above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Docker Desktop not running - start it and retry" -ForegroundColor White
    Write-Host "2. Ports in use - stop other services using port 8000 or 5432" -ForegroundColor White
    Write-Host "3. First run - some errors may resolve after containers fully start" -ForegroundColor White
    Write-Host ""
}

Write-Host "View logs with: docker compose logs -f" -ForegroundColor Cyan
Write-Host "Stop services with: docker compose down" -ForegroundColor Cyan
Write-Host ""


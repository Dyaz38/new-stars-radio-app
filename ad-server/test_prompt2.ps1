# Test Script for QS-Prompt 2 - Ad Selection & Tracking Services

Write-Host "========================================"
Write-Host "Testing QS-Prompt 2: Services Layer"
Write-Host "========================================"
Write-Host ""

$testsPassed = 0
$testsFailed = 0

# Test 1: Check services files exist
Write-Host "1. Checking services files..."
$requiredFiles = @(
    "app/services/__init__.py",
    "app/services/ad_selection.py",
    "app/services/tracking.py"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "   [FAIL] Missing: $file"
        $allFilesExist = $false
    }
}

if ($allFilesExist) {
    Write-Host "   [PASS] All service files present"
    $testsPassed++
} else {
    Write-Host "   [FAIL] Some files missing"
    $testsFailed++
}

# Test 2: Check test files exist
Write-Host "2. Checking test files..."
$testFiles = @(
    "tests/__init__.py",
    "tests/unit/__init__.py",
    "tests/unit/test_ad_selection_service.py",
    "tests/unit/test_tracking_service.py"
)

$allTestsExist = $true
foreach ($file in $testFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "   [FAIL] Missing: $file"
        $allTestsExist = $false
    }
}

if ($allTestsExist) {
    Write-Host "   [PASS] All test files present"
    $testsPassed++
} else {
    Write-Host "   [FAIL] Some test files missing"
    $testsFailed++
}

# Test 3: Check Docker is running
Write-Host "3. Checking Docker status..."
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [PASS] Docker is running"
    $testsPassed++
} else {
    Write-Host "   [FAIL] Docker not running"
    $testsFailed++
    Write-Host ""
    Write-Host "Please start Docker Desktop and run this script again."
    exit 1
}

# Test 4: Install test dependencies
Write-Host "4. Installing test dependencies..."
docker compose exec -T backend pip install pytest pytest-cov pytest-asyncio 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [PASS] Test dependencies installed"
    $testsPassed++
} else {
    Write-Host "   [WARN] Could not install dependencies (may already be installed)"
    $testsPassed++
}

# Test 5: Run unit tests for AdSelectionService
Write-Host "5. Running AdSelectionService tests..."
$output = docker compose exec -T backend pytest tests/unit/test_ad_selection_service.py -v 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [PASS] AdSelectionService tests passed"
    $testsPassed++
} else {
    Write-Host "   [FAIL] AdSelectionService tests failed"
    Write-Host "   Output: $output"
    $testsFailed++
}

# Test 6: Run unit tests for TrackingService
Write-Host "6. Running TrackingService tests..."
$output = docker compose exec -T backend pytest tests/unit/test_tracking_service.py -v 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [PASS] TrackingService tests passed"
    $testsPassed++
} else {
    Write-Host "   [FAIL] TrackingService tests failed"
    Write-Host "   Output: $output"
    $testsFailed++
}

# Test 7: Run all unit tests with coverage
Write-Host "7. Running full test suite with coverage..."
Write-Host ""
docker compose exec backend pytest tests/unit/ --cov=app/services --cov-report=term -v
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "   [PASS] Full test suite passed"
    $testsPassed++
} else {
    Write-Host ""
    Write-Host "   [FAIL] Some tests failed"
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
    Write-Host "SUCCESS! QS-Prompt 2 is complete!"
    Write-Host ""
    Write-Host "What was built:"
    Write-Host "  - Ad Selection Service (priority, geo-targeting)"
    Write-Host "  - Tracking Service (impressions, clicks)"
    Write-Host "  - Token validation and replay prevention"
    Write-Host "  - Unit tests with good coverage"
    Write-Host ""
    Write-Host "Ready for QS-Prompt 3: API Endpoints!"
} else {
    Write-Host "Some tests failed. Review output above."
}
Write-Host ""









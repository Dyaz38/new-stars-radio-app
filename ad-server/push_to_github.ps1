# Script to push ad-server to GitHub
# Usage: .\push_to_github.ps1

Write-Host "🚀 Pushing Ad Server to GitHub..." -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "✅ Git repository already initialized" -ForegroundColor Green
    Write-Host ""
}

# Check if .env exists (should not be committed)
if (Test-Path ".env") {
    Write-Host "⚠️  .env file exists - making sure it's in .gitignore" -ForegroundColor Yellow
    if (-not (Test-Path ".gitignore")) {
        Write-Host "❌ .gitignore not found!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ .gitignore is in place" -ForegroundColor Green
    Write-Host ""
}

# Stage all files
Write-Host "📝 Staging files..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "✅ Files staged" -ForegroundColor Green
    Write-Host ""
    
    # Commit
    Write-Host "💾 Creating commit..." -ForegroundColor Yellow
    git commit -m "Initial commit - New Stars Radio Ad Server backend foundation (QS-Prompt 1)"
    Write-Host "✅ Commit created" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ℹ️  No changes to commit" -ForegroundColor Blue
    Write-Host ""
}

# Instructions for remote
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "📋 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a new repository on GitHub:" -ForegroundColor White
Write-Host "   https://github.com/new" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Repository name: new-stars-radio-ad-server" -ForegroundColor White
Write-Host ""
Write-Host "3. Choose Private or Public" -ForegroundColor White
Write-Host ""
Write-Host "4. Don't initialize with README" -ForegroundColor White
Write-Host ""
Write-Host "5. After creating, run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin https://github.com/YOUR-USERNAME/new-stars-radio-ad-server.git" -ForegroundColor Yellow
Write-Host "   git branch -M main" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "✅ Local repository is ready to push!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan


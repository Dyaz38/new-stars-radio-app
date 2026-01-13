# Setup Environment Variables for Local Development
# This script creates .env files for your frontend apps

Write-Host "🚀 Setting up environment variables..." -ForegroundColor Cyan

# Admin Panel .env
$adminPanelEnv = @"
# Backend API URL
VITE_API_BASE_URL=http://localhost:8000/api/v1
"@

$adminPanelPath = "ad-server\admin-panel\.env"
$adminPanelEnv | Out-File -FilePath $adminPanelPath -Encoding utf8
Write-Host "✅ Created $adminPanelPath" -ForegroundColor Green

# Radio App .env
$radioAppEnv = @"
# Backend API URL for Ad Server
VITE_AD_SERVER_URL=http://localhost:8000/api/v1

# Genius API (optional, for lyrics)
# VITE_GENIUS_ACCESS_TOKEN=your_genius_token_here
"@

$radioAppPath = "app\.env"
$radioAppEnv | Out-File -FilePath $radioAppPath -Encoding utf8
Write-Host "✅ Created $radioAppPath" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Environment variables configured!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Start backend: cd ad-server && docker compose up" -ForegroundColor Gray
Write-Host "   2. Start admin panel: cd ad-server\admin-panel && npm run dev" -ForegroundColor Gray
Write-Host "   3. Start radio app: cd app && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 For deployment instructions, see DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan



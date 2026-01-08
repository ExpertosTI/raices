# =====================================================
# Raíces App - PowerShell Deploy Script (Windows)
# Usage: .\deploy.ps1
# =====================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 Deploying Raíces App..." -ForegroundColor Cyan
Write-Host "   Target: raices.renace.tech" -ForegroundColor Gray

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Error: .env.production not found!" -ForegroundColor Red
    Write-Host "   Run: Copy-Item .env.production.example .env.production" -ForegroundColor Yellow
    Write-Host "   Then edit .env.production with real values" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Get-Content .env.production | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

Write-Host "📦 Building production containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache

Write-Host "🔄 Stopping old containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>$null

Write-Host "🚀 Starting production containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "🗄️ Running database migrations..." -ForegroundColor Yellow
docker exec raices_app_prod npx prisma migrate deploy

Write-Host "🔄 Running multi-tenant migration (assigning existing data to family)..." -ForegroundColor Yellow
try {
    docker exec raices_app_prod npm run migrate:multitenant
} catch {
    Write-Host "   (Multi-tenant migration already applied or skipped)" -ForegroundColor Gray
}

Write-Host "🌱 Running database seed (if first deploy)..." -ForegroundColor Yellow
try {
    docker exec raices_app_prod npx prisma db seed
} catch {
    Write-Host "   (Seed already applied or skipped)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "   📍 Local: http://localhost:6789" -ForegroundColor White
Write-Host "   🌐 Domain: https://raices.renace.tech" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

Write-Host ""
Write-Host "📋 Container status:" -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "📋 Recent logs:" -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml logs --tail=10

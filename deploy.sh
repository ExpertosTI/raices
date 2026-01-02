#!/bin/bash
# =====================================================
# Raíces App - Deploy Script
# Usage: ./deploy.sh
# =====================================================

set -e

echo "🚀 Deploying Raíces App..."
echo "   Target: raices.renace.tech"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production not found!"
    echo "   Run: cp .env.production.example .env.production"
    echo "   Then edit .env.production with real values"
    exit 1
fi

# Load production environment
set -a
source .env.production
set +a

echo "📦 Building production containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🔄 Stopping old containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

echo "🚀 Starting production containers..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for database to be ready..."
sleep 15

echo "🗄️ Running database migrations..."
docker exec raices_app_prod npx prisma migrate deploy

echo "🌱 Running database seed (if first deploy)..."
docker exec raices_app_prod npx prisma db seed || echo "   (Seed already applied or skipped)"

echo ""
echo "✅ Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   📍 Local: http://localhost:6789"
echo "   🌐 Domain: https://raices.renace.tech"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Container status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=10

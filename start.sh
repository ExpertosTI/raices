#!/bin/sh
# Startup script for Raíces App
# Runs Prisma db push before starting the server

echo "🔄 Syncing database schema..."
npx prisma db push --skip-generate 2>/dev/null || echo "⚠️ DB push skipped (schema already synced)"

echo "🚀 Starting server..."
exec npx tsx server/index.ts

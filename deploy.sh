#!/bin/bash
# Despliegue de Raíces App en Servidor (Hostinger/VPS)

echo "🌳 Desplegando Raíces App..."

# 1. Obtener últimas cambios
git pull origin main

# 2. Generar cliente Prisma (por si hubo cambios de esquema)
echo "📦 Generando Prisma Client..."
docker-compose -f docker-compose.prod.yml exec app npx prisma generate

# 3. Aplicar migraciones DB
echo "🗄️ Migrando Base de Datos..."
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# 4. Reconstruir y Reiniciar Contenedores (Sin caché para asegurar cambios de build)
echo "🚀 Reiniciando Contenedores..."
docker-compose -f docker-compose.prod.yml up -d --build

# 5. Limpieza
docker image prune -f

echo "✅ Despliegue Completado!"
echo "Verifica logs con: docker logs -f raices_app"

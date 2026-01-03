#!/bin/bash
set -e

echo "🚀 Iniciando despliegue (Workflow Validado)..."

# 1. Actualizar código
git pull origin master

# 2. Construir imagen (No caché)
docker build --no-cache -t raices-app:latest -f Dockerfile.prod .

# 3. Actualizar Servicio (Swarm)
docker service update --image raices-app:latest --force raices-app_app

# 4. Asegurar esquema DB (Prisma)
# Esperamos unos segundos para que e servicio levante
sleep 10
CONTAINER_ID=$(docker ps -q -f name=raices-app_app | head -n 1)

if [ -n "$CONTAINER_ID" ]; then
    echo "Ejecutando prisma generate en: $CONTAINER_ID"
    # Quitamos -it para evitar errores en scripts no interactivos, usamos solo exec
    docker exec $CONTAINER_ID npx prisma generate
    # Agregamos migrate deploy por seguridad ya que hubo cambios en la DB
    docker exec $CONTAINER_ID npx prisma db push
else
    echo "⚠️ No se encontró el contenedor para ejecutar comandos de Prisma."
fi

echo "✅ Despliegue completado."

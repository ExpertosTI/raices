#!/bin/bash
set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Iniciando despliegue de Raíces App (Compose)...${NC}"

# 1. Pull
echo -e "${GREEN}📥 Descargando cambios...${NC}"
git pull origin master

# 2. Build & Up (Compose)
# Usamos docker compose (v2) y forzamos recreación para tomar cambios
echo -e "${GREEN}🏗️  Reconstruyendo y levantando contenedores...${NC}"
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# 3. Migrations
echo -e "${GREEN}⏳ Esperando inicio de DB (10s)...${NC}"
sleep 10

echo -e "${GREEN}🗄️  Ejecutando migraciones...${NC}"
# Nombre del contenedor definido en docker-compose.prod.yml: raices_app_prod
CONTAINER_NAME="raices_app_prod"

if docker ps | grep -q $CONTAINER_NAME; then
    echo " > Generando cliente Prisma..."
    docker exec $CONTAINER_NAME npx prisma generate
    
    echo " > Aplicando migraciones..."
    docker exec $CONTAINER_NAME npx prisma migrate deploy
    
    echo -e "${GREEN}✅ Base de datos sincronizada.${NC}"
else
    echo -e "${RED}❌ Contenedor '$CONTAINER_NAME' no encontrado.${NC}"
fi

echo -e "${GREEN}✨ Despliegue Finalizado ✨${NC}"

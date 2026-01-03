#!/bin/bash
# Despliegue Robusto de Raíces App
# Maneja falta de Git, Docker Compose V2, y Variables de Entorno

set -e

echo "🌳 Iniciando Despliegue de Raíces App..."

# 1. Detectar comando Docker Compose
if docker compose version >/dev/null 2>&1; then
    CDM="docker compose"
    echo "✅ Docker Compose v2 detectado"
elif docker-compose version >/dev/null 2>&1; then
    CDM="docker-compose"
    echo "✅ Docker Compose v1 detectado"
else
    echo "❌ Error: Docker Compose no encontrado. Instálalo primero."
    exit 1
fi

# 2. Verificar repositorio Git
if [ ! -d ".git" ]; then
    echo "⚠️ No se detectó repositorio Git. Inicializando..."
    git init
    git remote add origin https://github.com/ExpertosTI/raices.git
    git fetch origin
    git checkout master -f
    echo "✅ Repositorio clonado (master)"
else
    echo "🔄 Actualizando código..."
    git pull origin master
fi

# 3. Verificar Archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️ .env no encontrado. Creando con valores por defecto..."
    cat <<EOF > .env
NODE_ENV=production
# Puerto interno del contenedor (no cambiar si usas docker-compose por defecto)
PORT=6789
ALLOWED_ORIGIN=https://raices.renace.tech

# Base de Datos (Interna en Docker)
DB_USER=raices
DB_PASSWORD=raices_secure_pass_2026
DB_NAME=raices_db
DATABASE_URL=postgresql://raices:raices_secure_pass_2026@db:5432/raices_db

# Auth (Debes cambiarlos en producción)
JWT_SECRET=cambiar_esto_por_secreto_seguro_generado_randomly
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_secret

# Email (Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=info@renace.space
SMTP_PASS=JustWork2026@
ADMIN_EMAIL=adderlymarte@hotmail.com
EOF
    echo "✅ .env creado. (Revisa JWT_SECRET y Credenciales si es necesario)"
fi

# 4. Generar Cliente Prisma
echo "📦 Generando Cliente Prisma..."
$CDM -f docker-compose.prod.yml run --rm app npx prisma generate

# 5. Migrar Base de Datos
echo "🗄️ Migrando Base de Datos..."
$CDM -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# 6. Reconstruir y Levantar
echo "🚀 Levantando Contenedores..."
$CDM -f docker-compose.prod.yml up -d --build --remove-orphans

# 7. Limpieza
docker image prune -f

echo "✅ ¡Despliegue Exitoso!"
echo "📜 Logs: docker logs -f raices_app_prod"

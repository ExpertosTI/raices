# Raíces App - Plataforma Familiar Integral

> Sistema genealógico privado para la Familia Henríquez Cruz.

## 🚀 Quick Start (Desarrollo)

```bash
# 1. Clonar y entrar al directorio
cd raices-app

# 2. Iniciar con Docker
docker-compose up --build

# 3. En otra terminal, ejecutar migraciones
docker exec raices_app npx prisma migrate dev
docker exec raices_app npx prisma db seed

# 4. Abrir en navegador
open http://localhost:6789
```

## 📦 Producción

### Requisitos
- Docker & Docker Compose
- Dominio configurado: `raices.renace.tech`
- Credenciales Google OAuth (opcional)

### Deploy

```bash
# 1. Configurar variables de entorno
cp .env.production.example .env.production
# Editar .env.production con valores reales

# 2. Ejecutar deploy
./deploy.ps1  # Windows
./deploy.sh   # Linux/Mac
```

### Variables de Entorno Requeridas

| Variable | Descripción |
|----------|-------------|
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `JWT_SECRET` | Secreto para tokens JWT |
| `GOOGLE_CLIENT_ID` | ID de cliente Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Secreto de Google OAuth |

## 🏗️ Arquitectura

```
raices-app/
├── src/                 # Frontend (React + Vite)
│   ├── modules/
│   │   ├── home/        # Dashboard, Splash
│   │   ├── family/      # Selección de rama
│   │   └── tree/        # Visualización árbol
│   └── shared/          # Estilos globales
├── server/              # Backend (Express)
│   ├── controllers/     # Auth, Feed
│   ├── middleware/      # JWT, Permisos
│   └── services/        # Cumpleaños
├── prisma/              # ORM
│   ├── schema.prisma    # Modelos
│   └── seed.ts          # Datos iniciales
└── docker-compose.yml   # Desarrollo
```

## 🔐 Permisos

| Rol | Puede |
|-----|-------|
| **Patriarca** | Editar cualquier perfil |
| **Miembro** | Solo editar su propio perfil |

## 📱 Características

- 🌳 Árbol genealógico interactivo (3 vistas)
- 🎂 Recordatorio de cumpleaños
- 📰 Feed de actividad familiar
- 👤 Registro de nuevos miembros
- 🔒 Autenticación segura

## 🌐 Dominio

- **Producción**: https://raices.renace.tech
- **Desarrollo**: http://localhost:6789

---

*Raíces v1.0 - Con amor para la Familia Henríquez Cruz* 🌳❤️

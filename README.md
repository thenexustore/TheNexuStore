# The Nexu Store

A **full-stack e-commerce platform** composed of:

- A NestJS backend API.
- A customer-facing store built with Next.js.
- An admin panel built with Next.js.
- Infrastructure services managed with Docker Compose (PostgreSQL, Redis, and RabbitMQ).

## Tech Stack

### Backend (`Backend/Store`)
- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- RabbitMQ

### Frontend (`Frontend`)
- **Store:** Next.js
- **Admin:** Next.js

### Infrastructure
- Docker
- Docker Compose

## Repository Structure

```text
Backend/
  Store/           # Main API (NestJS)
Frontend/
  Store/           # Customer-facing store (Next.js)
  admin/           # Admin panel (Next.js)
docker-compose.yml # Infrastructure services
```

## Requisitos para VPS

- Ubuntu/Debian con acceso sudo
- Node.js 20+
- npm
- Docker + Docker Compose plugin

## Despliegue en VPS (paso a paso)

### 1) Clonar repo

```bash
git clone <tu-repo> /var/www/TheNexuStore
cd /var/www/TheNexuStore
```

### 2) Levantar infraestructura (Postgres/Redis/RabbitMQ)

```bash
docker compose up -d
```

### 3) Configurar backend

```bash
cd Backend/Store
cp .env.example .env
```

Revisa `.env` y ajusta dominios/IP de tu VPS:

- `DATABASE_URL=postgresql://nexu:nexu_pass@localhost:5432/nexustore`
- `FRONTEND_URL=http://<IP_O_DOMINIO_VPS>:3000`
- `ADMIN_URL=http://<IP_O_DOMINIO_VPS>:3001`
- `CORS_ORIGINS=http://<IP_O_DOMINIO_VPS>:3000,http://<IP_O_DOMINIO_VPS>:3001`
- `JWT_SECRET=<un-valor-fuerte>`

Instalar dependencias, generar Prisma y migrar DB:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod
```

Backend esperado en `http://<IP_O_DOMINIO_VPS>:4000`.

### 4) Configurar Store frontend

```bash
cd /var/www/TheNexuStore/Frontend/Store
cp .env.example .env.production
```

Editar `.env.production`:

```env
NEXT_PUBLIC_API_URL=http://<IP_O_DOMINIO_VPS>:4000
NEXT_PUBLIC_SITE_URL=http://<IP_O_DOMINIO_VPS>:3000
```

Ejecutar:

```bash
npm install
npm run build
npm run start -- -p 3000
```

### 5) Configurar Admin frontend

```bash
cd /var/www/TheNexuStore/Frontend/admin
cp .env.example .env.production
```

Editar `.env.production`:

```env
NEXT_PUBLIC_API_URL=http://<IP_O_DOMINIO_VPS>:4000
NEXT_PUBLIC_SITE_URL=http://<IP_O_DOMINIO_VPS>:3001
```

Ejecutar:

```bash
npm install
npm run build
npm run start -- -p 3001
```

## Sincronización por fases (recomendado)

Para evitar desajustes entre backend/store/admin, usa `ops/env.sync.example` como contrato único y después reparte los valores en cada servicio.

### Fase 1 (base de conectividad)
1. Copia `ops/env.sync.example` como guía.
2. Actualiza:
   - `Backend/Store/.env`
   - `Frontend/Store/.env.production`
   - `Frontend/admin/.env.production`
3. Asegura que `API_URL`, `FRONTEND_URL`, `ADMIN_URL`, `CORS_ORIGINS` y ambos `NEXT_PUBLIC_API_URL` apunten al mismo backend.
4. Ejecuta health checks (`curl http://127.0.0.1:4000/health`).

### Fase 2 (resiliencia)
- Endurecer manejo de errores global y observabilidad.
- Añadir checks de smoke end-to-end Store/Admin contra API.

### Fase 3 (operación)
- Centralizar logs/auditoría.
- Automatizar validaciones de configuración en CI/CD.

## Script de despliegue automatizado

También puedes usar `ops/nexus_deploy.sh` para automatizar todo (pull del repo, build, migraciones Prisma, PM2 y healthchecks):

```bash
BACKEND_ENV_FILE=/root/nexus-backend.env REPO_DIR=/opt/TheNexuStore BRANCH=main bash ops/nexus_deploy.sh
```

Modo simulación (no ejecuta cambios):

```bash
BACKEND_ENV_FILE=/root/nexus-backend.env bash ops/nexus_deploy.sh --dry-run
```

Variables útiles del script:
- `REPO_URL` y `FALLBACK_LOCAL_REPO`: para clonar si `REPO_DIR` no existe aún.
- `SITE_DOMAIN`, `ADMIN_DOMAIN`, `API_DOMAIN`: URLs públicas para generar `.env.production`.
- `SYNC_FRONTEND_ENV=0`: evita sobreescribir los `.env.production` de Store/Admin.
- `SKIP_EXTERNAL_HEALTHCHECKS=0`: activa checks externos además de localhost.

## Verificaciones rápidas

- API health:
  ```bash
  curl -i http://127.0.0.1:4000
  ```
- Store abre en navegador:
  - `http://<IP_O_DOMINIO_VPS>:3000`
- Admin abre en navegador:
  - `http://<IP_O_DOMINIO_VPS>:3001`

## Errores comunes que rompen todo

- No crear `Backend/Store/.env` (el backend no arranca sin `DATABASE_URL`).
- `DATABASE_URL` con credenciales distintas a las de `docker-compose.yml`.
- No correr `npx prisma migrate deploy`.
- Build frontend con `NEXT_PUBLIC_API_URL` mal apuntando a localhost equivocado.
- CORS sin incluir dominio/IP reales del Store/Admin.

## Producción recomendada

- Usar **Nginx** como reverse proxy para 3000/3001/4000.
- Correr procesos con **pm2** o systemd.
- Abrir puertos 80/443 y no exponer 5432/6379/5672 públicamente.

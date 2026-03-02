# The Nexu Store

Plataforma **e-commerce full stack** compuesta por:

- API backend con NestJS.
- Tienda pública (storefront) en Next.js.
- Panel de administración en Next.js.
- Servicios de infraestructura con Docker Compose (PostgreSQL, Redis y RabbitMQ).

## Stack tecnológico

### Backend (`Backend/Store`)
- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- RabbitMQ

### Frontend (`Frontend`)
- **Store:** Next.js
- **Admin:** Next.js

### Infraestructura
- Docker
- Docker Compose

## Estructura del repositorio

```text
Backend/
  Store/           # API principal (NestJS)
Frontend/
  Store/           # Tienda pública (Next.js)
  admin/           # Panel de administración (Next.js)
docker-compose.yml # Servicios de infraestructura
docs/              # Documentación adicional
```

## Prerrequisitos

- Node.js 18+
- npm
- Docker
- Docker Compose

## Puesta en marcha rápida

### 1) Levantar infraestructura

```bash
docker-compose up -d
```

Servicios expuestos:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- RabbitMQ: `localhost:5672`
- RabbitMQ UI: `http://localhost:15672`

### 2) Backend

```bash
cd Backend/Store
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

API disponible en: `http://localhost:4000`

### 3) Frontend Store

```bash
cd Frontend/Store
npm install
npm run dev
```

Store disponible en: `http://localhost:3000`

### 4) Frontend Admin

```bash
cd Frontend/admin
npm install
PORT=3001 npm run dev
```

Admin disponible en: `http://localhost:3001`

## Notas

- Docker se usa para infraestructura compartida.
- Backend y frontends se ejecutan localmente con Node.js.
- Si no defines `PORT` en admin, Next.js usará el puerto por defecto (`3000`).

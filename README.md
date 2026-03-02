# The Nexu Store

The Nexu Store is a **full-stack e-commerce platform** with three main applications:

- **Backend API** (`Backend/Store`) built with NestJS + Prisma
- **Storefront** (`Frontend/Store`) built with Next.js
- **Admin panel** (`Frontend/admin`) built with Next.js

Infrastructure dependencies are provided through Docker Compose:

- PostgreSQL
- Redis
- RabbitMQ (with Management UI)

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
  Store/            # Main API (NestJS)
Frontend/
  Store/            # Customer-facing storefront (Next.js)
  admin/            # Admin panel (Next.js)
docker-compose.yml  # Local infrastructure services
docs/               # Additional docs
```

## Prerequisites

- Node.js 18+
- npm
- Docker
- Docker Compose

## Quick Start

### 1) Start infrastructure

Use either command depending on your Docker setup:

```bash
docker compose up -d
# or
docker-compose up -d
```

### 2) Run backend

```bash
cd Backend/Store
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Backend URL: `http://localhost:4000`

### 3) Run storefront

```bash
cd Frontend/Store
npm install
npm run dev
```

Storefront URL: `http://localhost:3000`

### 4) Run admin panel

```bash
cd Frontend/admin
npm install
PORT=3001 npm run dev
```

Admin URL: `http://localhost:3001`

## Local Services

| Service | URL / Port | Notes |
|---|---|---|
| PostgreSQL | `localhost:5432` | DB: `nexustore`, user: `nexu` |
| Redis | `localhost:6379` | Cache / queue support |
| RabbitMQ | `localhost:5672` | AMQP |
| RabbitMQ Management | `http://localhost:15672` | Web UI |

## Useful Commands

### Backend (`Backend/Store`)

```bash
npm run start:dev   # run in watch mode
npm run test        # unit tests
npm run test:e2e    # e2e tests
npm run lint        # linting
```

### Storefront (`Frontend/Store`)

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Admin (`Frontend/admin`)

```bash
npm run dev
npm run build
npm run start
```

## GitHub Sync (No-Conflict Workflow)

Before opening a PR, keep your branch up to date with `main`:

```bash
git fetch origin
git checkout main
git pull origin main
git checkout <your-branch>
git rebase main
```

If there are conflicts, resolve them, then continue:

```bash
git add .
git rebase --continue
```

Push your branch safely:

```bash
git push --force-with-lease
```

## Notes

- Docker is used for shared infrastructure only.
- Application processes (backend/store/admin) run locally with Node.js.
- If `PORT` is not set for the admin app, Next.js defaults to `3000`.

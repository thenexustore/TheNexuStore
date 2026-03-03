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
docs/              # Additional documentation
```

## Prerequisites

- Node.js 18+
- npm
- Docker
- Docker Compose

## Quick Start

### 1) Start infrastructure

```bash
docker-compose up -d
```

Exposed services:
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

API URL: `http://localhost:4000`

### 3) Store Frontend

```bash
cd Frontend/Store
npm install
npm run dev
```

Store URL: `http://localhost:3000`

### 4) Admin Frontend

```bash
cd Frontend/admin
npm install
PORT=3001 npm run dev
```

Admin URL: `http://localhost:3001`

## Notes

- Docker is used for shared infrastructure services.
- Backend and frontend apps run locally with Node.js.
- If you do not set `PORT` for admin, Next.js uses the default port (`3000`).

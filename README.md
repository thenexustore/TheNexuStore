Nexus Store – Full Stack E-commerce Platform

Nexus Store is a full-stack e-commerce platform built using modern web technologies.
The project consists of a backend API, a customer-facing store, an admin panel, and supporting infrastructure services.

Tech Stack

Backend

- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- RabbitMQ

Frontend

- Store Frontend: Next.js
- Admin Panel: Next.js

Infrastructure

- Docker
- Docker Compose

Repository Structure

Backend/
Store – NestJS backend API
Frontend/
Store – Customer-facing store (Next.js)
Admin – Admin panel (Next.js)
docker-compose.yml – Infrastructure services
docs – Architecture and documentation

Prerequisites

- Node.js (v18 or later)
- Docker
- Docker Compose

Setup Instructions

1. Start Infrastructure Services
   docker-compose up -d

2. Backend Setup
   cd Backend/Store
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run start:dev

Backend URL: http://localhost:4000

3. Store Frontend Setup
   cd Frontend/Store
   npm install
   npm run dev

Store URL: http://localhost:3000

4. Admin Panel Setup
   cd Frontend/admin
   npm install
   npm run dev

Admin URL: http://localhost:3001

Notes
Docker is used only for infrastructure services.
Backend and frontend applications run locally.

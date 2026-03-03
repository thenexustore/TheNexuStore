# Migración de producción en VPS (ARSYS + Plesk)

## Objetivo

Hacer que **este repositorio** (`/workspace/TheNexuStore`) sea la única fuente de despliegue en producción y **sobrescriba** el stack legacy (`/opt/Nexus-Store` y especialmente `/var/www/backend/Backend/Store`).

---

## Contexto actual (según bitácora)

- Producción sirve:
  - Store en `3000`
  - Admin en `3001`
  - API en `4000`
- PM2 está persistente y operativo.
- La API todavía corre desde ruta legacy: `/var/www/backend/Backend/Store/dist/main.js`.
- Entorno real de backend se carga desde `/root/nexus-backend.env`.

---

## Estrategia recomendada (sin downtime relevante)

1. Preparar nuevo release del repo en `/opt/TheNexuStore`.
2. Compilar backend/frontend en esa ruta.
3. Cambiar PM2 para ejecutar desde `/opt/TheNexuStore`.
4. Verificar healthchecks y frontend.
5. Mantener rollback inmediato al proceso legacy (por si hiciera falta).

---

## 1) Preflight de seguridad

> Ejecutar en VPS como root.

```bash
set -euo pipefail

echo "[1/6] Snapshot PM2"
pm2 status
pm2 save

# backup rápido de env crítico
cp -a /root/nexus-backend.env /root/nexus-backend.env.bak.$(date +%F_%H%M)
```

Opcional (muy recomendado):

```bash
# backup DB antes de switch
PGPASSWORD='<PASSWORD_NEXU>' pg_dump -h 127.0.0.1 -U nexu -d nexustore | gzip > /root/backup_nexustore_pre_switch_$(date +%F_%H%M).sql.gz
chmod 600 /root/backup_nexustore_pre_switch_*.sql.gz
```

---

## 2) Desplegar código NUEVO en ruta final

```bash
# ejemplo: rama main
mkdir -p /opt
cd /opt

if [ ! -d /opt/TheNexuStore/.git ]; then
  git clone <URL_GIT_REPO> /opt/TheNexuStore
fi

cd /opt/TheNexuStore
git fetch --all --prune
git checkout main
git pull --ff-only
```

---

## 3) Infraestructura base

El repo trae `docker-compose.yml` para PostgreSQL, Redis y RabbitMQ. Si ya están gestionados, no dupliques servicios; si no lo están, levántalos aquí:

```bash
cd /opt/TheNexuStore
docker compose up -d
```

---

## 4) Backend desde /opt/TheNexuStore (nuevo origen)

```bash
cd /opt/TheNexuStore/Backend/Store
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

### Script de arranque unificado

Crear `/usr/local/bin/nexus-backend-start.sh` apuntando al repo nuevo:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/TheNexuStore/Backend/Store

# source of truth de entorno en producción
source /root/nexus-backend.env

exec node dist/main.js
```

Aplicar permisos:

```bash
chmod +x /usr/local/bin/nexus-backend-start.sh
sed -i 's/\r$//' /usr/local/bin/nexus-backend-start.sh /root/nexus-backend.env
```

### Reapuntar PM2 backend

```bash
# Si existe proceso anterior, reemplazarlo por el nuevo
pm2 delete nexus-backend || true
pm2 start /usr/local/bin/nexus-backend-start.sh --name nexus-backend --time
pm2 save
```

Verificar:

```bash
pm2 logs nexus-backend --lines 80 --nostream
curl -sS http://127.0.0.1:4000/admin/health ; echo
curl -sS http://127.0.0.1:4000/admin/infortisa/health ; echo
```

---

## 5) Frontends desde /opt/TheNexuStore

### Store

```bash
cd /opt/TheNexuStore/Frontend/Store
npm ci
cat > .env.production <<'ENV'
NEXT_PUBLIC_API_URL=https://api.thenexustore.com
ENV
npm run build

pm2 delete nexus-store || true
pm2 start npm --name nexus-store -- start -- -p 3000
```

### Admin

```bash
cd /opt/TheNexuStore/Frontend/admin
npm ci
cat > .env.production <<'ENV'
NEXT_PUBLIC_API_URL=https://api.thenexustore.com
ENV
npm run build

pm2 delete nexus-admin || true
pm2 start npm --name nexus-admin -- start -- -p 3001
```

Guardar estado:

```bash
pm2 save
```

---

## 6) CORS / dominios

El backend tiene lista de orígenes permitidos en código. Si cambias dominios/subdominios, actualiza `Backend/Store/src/main.ts`, recompila y reinicia PM2.

---

## 7) Verificación final (checklist)

```bash
# procesos
pm2 status
ss -ltnp | egrep ':3000|:3001|:4000' || true

# health local
curl -sS http://127.0.0.1:4000/admin/health ; echo
curl -sS http://127.0.0.1:4000/admin/infortisa/health ; echo

# edge público
curl -I https://www.thenexustore.com/login
curl -I https://admin.thenexustore.com/login
curl -I https://api.thenexustore.com/
```

---

## 8) Rollback inmediato (si algo falla)

1. Restaurar proceso backend legacy:

```bash
pm2 delete nexus-backend || true
pm2 start "node /var/www/backend/Backend/Store/dist/main.js" --name nexus-backend
pm2 save
```

2. Si fuera necesario, volver a snapshot PM2 previo (`/root/.pm2/dump.pm2` backup) y reiniciar servicio PM2.

---

## 9) Resultado esperado

- Producción corriendo totalmente desde `/opt/TheNexuStore`.
- Eliminada dependencia operativa de `/var/www/backend/Backend/Store`.
- Mismo esquema de puertos/proxy (Plesk/Nginx) y mismo dominio público.

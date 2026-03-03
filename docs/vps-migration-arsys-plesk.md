# Producción VPS (ARSYS + Plesk): comando único anti-cortes (incluye fix DATABASE_URL)

Tu problema real ahora no es clonación, es que Prisma no ve `DATABASE_URL` durante deploy.
Para evitar más cortes de sesión, usa **este bloque único** (copiar/pegar):

```bash
set -Eeuo pipefail

# 1) Normaliza env y exporta DATABASE_URL en esta misma shell
sed -i 's/\r$//' /root/nexus-backend.env
export DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' /root/nexus-backend.env | tail -n 1 | sed 's/^"//; s/"$//')"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL vacío en /root/nexus-backend.env"
  exit 1
fi

# 2) Asegura repo runtime desde el checkout local existente
if [ ! -d /opt/TheNexuStore/.git ]; then
  git clone /opt/Nexus-Store /opt/TheNexuStore
fi

# 3) Ejecuta deploy con fallback local
cd /opt/TheNexuStore
chmod +x ops/deploy-production.sh
DATABASE_URL="$DATABASE_URL" FALLBACK_LOCAL_REPO=/opt/Nexus-Store BACKEND_ENV_FILE=/root/nexus-backend.env bash ops/deploy-production.sh
```

---

## Verificación rápida

```bash
pm2 status
curl -sS http://127.0.0.1:4000/admin/health ; echo
curl -sS http://127.0.0.1:4000/admin/infortisa/health ; echo
curl -I https://www.thenexustore.com/login
curl -I https://admin.thenexustore.com/login
curl -I https://api.thenexustore.com/
```

---

## Qué cambié en el script

`ops/deploy-production.sh` ahora:

1. Carga env desde `BACKEND_ENV_FILE`.
2. Si `DATABASE_URL` no aparece al hacer `source`, lo extrae por parse directo del fichero.
3. Ejecuta Prisma con `DATABASE_URL=... npx prisma ...` explícito.

Así no depende de comportamientos de shell/exports en VPS.

---

## How to deploy safely

Use the deploy script as the single entry point. It now stores `PREV_SHA` before syncing code, deploys backend first, waits up to 30s for `/admin/health`, and auto-rolls back + rebuilds backend if the health check fails.

```bash
cd /opt/TheNexuStore
chmod +x ops/deploy-production.sh
BACKEND_ENV_FILE=/root/nexus-backend.env \
FALLBACK_LOCAL_REPO=/opt/Nexus-Store \
bash ops/deploy-production.sh
```

Safety flow:
1. Save `PREV_SHA`.
2. Update to target branch.
3. Build + restart backend.
4. Poll `http://127.0.0.1:4000/admin/health` for up to 30s.
5. If unhealthy, reset to `PREV_SHA`, rebuild backend, restart, and re-check health.


Deployment hardening notes:
- Frontends now use a safe sequence: `pm2 stop` -> `rm -rf .next` -> `npm ci` -> `npm run build` -> `pm2 restart/start`.
- Script-level smoke tests now retry both TCP port readiness and HTTP checks for backend/admin/store before final success.


## Deploy sequence requirement (Next.js stability)

To avoid Next.js 16 production runtime manifest issues, deploy must always run this order per frontend app:

1. `pm2 stop <app>`
2. `rm -rf .next`
3. `npm ci`
4. `npm run build` (Webpack)
5. `pm2 restart <app>` (or start if missing)
6. Smoke checks with retries (`wait_for_port` + `curl`)

**Do not** delete `.next` while the PM2 app is still running.


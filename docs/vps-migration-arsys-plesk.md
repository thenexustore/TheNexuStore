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

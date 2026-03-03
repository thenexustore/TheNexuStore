# Producción VPS (ARSYS + Plesk): comando único anti-cortes (incluye fix de ramas divergentes)

Tu último error fue este:

- `fatal: Not possible to fast-forward, aborting.`

Eso pasa cuando la rama local y `origin/main` divergen. El script ya quedó preparado para eso: ahora puede forzar sincronización con `origin/main` durante el deploy.

## Copiar/pegar AHORA (bloque único)

```bash
set -Eeuo pipefail

# 1) Normaliza env y exporta DATABASE_URL
sed -i 's/\r$//' /root/nexus-backend.env
export DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' /root/nexus-backend.env | tail -n 1 | sed 's/^"//; s/"$//')"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL vacío en /root/nexus-backend.env"
  exit 1
fi

# 2) Asegura runtime repo desde checkout local
if [ ! -d /opt/TheNexuStore/.git ]; then
  git clone /opt/Nexus-Store /opt/TheNexuStore
fi

# 3) Deploy forzando sync con origin/main para evitar divergencias
cd /opt/TheNexuStore
chmod +x ops/deploy-production.sh
DATABASE_URL="$DATABASE_URL" \
FALLBACK_LOCAL_REPO=/opt/Nexus-Store \
BACKEND_ENV_FILE=/root/nexus-backend.env \
FORCE_SYNC_WITH_ORIGIN=1 \
bash ops/deploy-production.sh
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

## Nota importante (FORCE_SYNC_WITH_ORIGIN)

`FORCE_SYNC_WITH_ORIGIN=1` (por defecto) hace esto al actualizar repo:

- `git checkout -B <branch> origin/<branch>`
- `git reset --hard origin/<branch>`
- `git clean -fd`

Con esto se evita el error de fast-forward por ramas divergentes y el deploy siempre queda alineado con `origin/<branch>`.

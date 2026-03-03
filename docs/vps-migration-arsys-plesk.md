# Producción VPS (ARSYS + Plesk): **sobrescribir legacy** y dejar este repo como única fuente de verdad

## Objetivo

Forzar que producción ejecute **solo** desde `/opt/TheNexuStore` y eliminar dependencia operativa de rutas legacy como:

- `/opt/Nexus-Store`
- `/var/www/backend/Backend/Store`

---

## Enfoque recomendado (el que debes usar)

Usa el script versionado en este repo:

- `ops/deploy-production.sh`

Ese script:

1. Crea/clona el repo si falta (si le pasas `REPO_URL`).
2. Actualiza código en `/opt/TheNexuStore`.
3. Builda backend y frontends.
4. Reescribe el arranque backend en `/usr/local/bin/nexus-backend-start.sh` apuntando al repo nuevo.
5. Reemplaza procesos PM2 (`nexus-backend`, `nexus-store`, `nexus-admin`).
6. Ejecuta health checks.

Con esto, cada deploy **sobrescribe** el estado anterior y consolida este repo como source of truth.

---

## Requisitos

- `pm2`, `node/npm`, `git` disponibles.
- Entorno backend en `/root/nexus-backend.env` (source of truth para variables sensibles).
- Proxy (Plesk/Nginx) ya enruta:
  - `www.thenexustore.com` → `127.0.0.1:3000`
  - `admin.thenexustore.com` → `127.0.0.1:3001`
  - `api.thenexustore.com` → `127.0.0.1:4000`

---

## Comando único de despliegue

### Caso A: `/opt/TheNexuStore` ya existe

```bash
cd /opt/TheNexuStore
bash ops/deploy-production.sh
```

### Caso B: `/opt/TheNexuStore` no existe (tu error actual)

```bash
curl -fsSL <RAW_URL_DE_ESTE_SCRIPT> -o /root/deploy-production.sh
chmod +x /root/deploy-production.sh
REPO_URL='git@github.com:ORG/REPO.git' /root/deploy-production.sh
```

> Si prefieres HTTPS en vez de SSH:
>
> `REPO_URL='https://github.com/ORG/REPO.git' /root/deploy-production.sh`

Opciones útiles:

```bash
BRANCH=main API_DOMAIN=https://api.thenexustore.com /root/deploy-production.sh
```

---

## Validación post-deploy

```bash
pm2 status
curl -sS http://127.0.0.1:4000/admin/health ; echo
curl -sS http://127.0.0.1:4000/admin/infortisa/health ; echo
curl -I https://www.thenexustore.com/login
curl -I https://admin.thenexustore.com/login
curl -I https://api.thenexustore.com/
```

---

## Qué queda “anulado” del setup legacy

Tras ejecutar el script, los procesos PM2 se recrean desde rutas de `/opt/TheNexuStore`, por lo que el runtime legacy deja de ser la referencia activa.

Si quieres limpieza total adicional (opcional, cuando estés seguro):

```bash
# SOLO cuando verifiques todo OK
mv /var/www/backend/Backend/Store /var/www/backend/Backend/Store.legacy.$(date +%F_%H%M)
```

---

## Rollback rápido (si algo falla)

```bash
pm2 delete nexus-backend || true
pm2 start "node /var/www/backend/Backend/Store/dist/main.js" --name nexus-backend
pm2 save
```

Y restaurar frontends al estado previo si los tenías fuera de `/opt/TheNexuStore`.

---

## Nota de CORS

Si cambias dominios, revisa y ajusta la whitelist de orígenes en `Backend/Store/src/main.ts`, luego rebuild y redeploy.

# TheNexuStore Production Stabilization Runbook (ARSYS VPS)

## 1) Root-cause summary (current incident)

The frontends can crash in browser with `Missing required environment variable` when `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_SITE_URL` were not injected at build time. This causes a client-side exception page instead of graceful degradation.

This repository now includes:

- Safe frontend env fallback values (production domains) to prevent hard crash.
- Deterministic deploy script with backup, build order, migration, PM2 restart, and health checks.
- Rollback script restoring the latest backup tar.

## 2) One-time server setup

```bash
# from repo root
sudo install -m 755 ops/nexus_deploy.sh /usr/local/bin/nexus_deploy.sh
sudo install -m 755 ops/nexus_rollback.sh /usr/local/bin/nexus_rollback.sh
```

## 3) Canonical production layout

- Repo source-of-truth: `/opt/TheNexuStore`
- Backend runtime: `/opt/TheNexuStore/Backend/Store`
- Store runtime: `/opt/TheNexuStore/Frontend/Store`
- Admin runtime: `/opt/TheNexuStore/Frontend/admin`

PM2 expected process names:

- `nexus-backend` (port 4000)
- `nexus-store` (port 3000)
- `nexus-admin` (port 3001)

## 4) Pre-flight triage commands

```bash
date; uptime; df -h; free -m
node -v; npm -v; pm2 -v
pm2 ls
ss -lntp | egrep ':3000|:3001|:4000'

curl -sS -I http://127.0.0.1:3000
curl -sS -I http://127.0.0.1:3001
curl -sS http://127.0.0.1:4000/admin/health ; echo
curl -sS http://127.0.0.1:4000/admin/infortisa/health ; echo

curl -sS -I https://www.thenexustore.com
curl -sS -I https://admin.thenexustore.com
curl -sS -I https://api.thenexustore.com/admin/health
```

## 5) Environment requirements

`/root/nexus-backend.env` must contain:

```dotenv
PORT=4000
DATABASE_URL=postgresql://<user>:<pass>@127.0.0.1:5432/<db>?schema=public
INFORTISA_API_TOKEN=<token>
FRONTEND_URL=https://www.thenexustore.com
```

Frontend env files:

- `/opt/TheNexuStore/Frontend/Store/.env.production`
- `/opt/TheNexuStore/Frontend/admin/.env.production`

Both should contain:

```dotenv
NEXT_PUBLIC_API_URL=https://api.thenexustore.com
NEXT_PUBLIC_SITE_URL=https://www.thenexustore.com
```

Normalize line endings before deploy:

```bash
sed -i 's/\r$//' /root/nexus-backend.env
sed -i 's/\r$//' /opt/TheNexuStore/Frontend/Store/.env.production
sed -i 's/\r$//' /opt/TheNexuStore/Frontend/admin/.env.production
```

## 6) Deploy (one command)

```bash
sudo /usr/local/bin/nexus_deploy.sh
```

If `nexus_deploy.sh` is not found, update repo first and reinstall scripts:

```bash
cd /opt/TheNexuStore
git fetch --all --prune
git checkout main
git reset --hard origin/main
sudo install -m 755 ops/nexus_deploy.sh /usr/local/bin/nexus_deploy.sh
sudo install -m 755 ops/nexus_rollback.sh /usr/local/bin/nexus_rollback.sh
```

Dry run:

```bash
sudo /usr/local/bin/nexus_deploy.sh --dry-run
```

What it does:

1. Backup repo tar under `/root/nexus_backups/<timestamp>/repo_snapshot.tgz`
2. `git fetch` + hard reset to `origin/main`
3. Install deps (`npm ci` if lockfile exists, else `npm install`)
4. Backend build + `prisma generate` + `prisma migrate deploy`
5. Store/Admin builds
6. PM2 restarts with `--update-env`
7. PM2 save
8. Local health checks (ports 3000/3001/4000)

If a legacy checkout still contains both `middleware.ts` and `proxy.ts`, deploy scripts automatically remove `middleware.ts` before build to avoid Next.js 16 conflict.

Manual emergency fix (before deploy) if needed:

```bash
rm -f /opt/TheNexuStore/Frontend/Store/middleware.ts
rm -f /opt/TheNexuStore/Frontend/admin/middleware.ts
```

## 7) Rollback

Restore latest backup:

```bash
sudo /usr/local/bin/nexus_rollback.sh
```

Restore specific backup directory:

```bash
sudo /usr/local/bin/nexus_rollback.sh /root/nexus_backups/20260304_120000
```

## 8) Infortisa verification and full sync safe run

Health endpoint:

```bash
curl -sS http://127.0.0.1:4000/admin/infortisa/health ; echo
```

Safe nohup example:

```bash
nohup curl -sS -X POST \
  -H "Authorization-Token: $INFORTISA_API_TOKEN" \
  "http://127.0.0.1:4000/admin/infortisa/full-sync" \
  > /var/log/nexus-infortisa-full-sync.log 2>&1 &
```

Follow logs:

```bash
tail -f /var/log/nexus-infortisa-full-sync.log
```

## 9) Acceptance checks

```bash
pm2 ls
ss -lntp | egrep ':3000|:3001|:4000'

curl -sS -I http://127.0.0.1:3000
curl -sS -I http://127.0.0.1:3001
curl -sS -I http://127.0.0.1:4000/admin/health
curl -sS http://127.0.0.1:4000/admin/infortisa/health ; echo

curl -sS -I https://www.thenexustore.com
curl -sS -I https://admin.thenexustore.com
curl -sS -I https://api.thenexustore.com/admin/health
```

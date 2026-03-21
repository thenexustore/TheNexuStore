# TheNexuStore Production Stabilization Runbook (ARSYS VPS)

## 1) Root-cause summary (current incident)

The frontends can crash in browser with `Missing required environment variable` when `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_SITE_URL` were not injected at build time. This causes a client-side exception page instead of graceful degradation.

This repository now includes:

- Safe frontend env fallback values (production domains) to prevent hard crash.
- Deterministic deploy script with backup, build order, migration, PM2 restart, and health checks.
- Rollback script restoring the latest backup tar.

## 2) One-time server setup

```bash
# from repo root — install the bootstrap wrapper (not the full deploy script).
# The bootstrap is tiny and rarely changes; it always exec's whatever version of
# ops/nexus_deploy.sh is currently checked out in the repo.
sudo install -m 755 ops/nexus_deploy_bootstrap.sh /usr/local/bin/nexus_deploy.sh
sudo install -m 755 ops/nexus_rollback.sh /usr/local/bin/nexus_rollback.sh
```

> **Why a bootstrap instead of the full script?** If you install the full
> `nexus_deploy.sh` directly, it can become stale: the running copy is loaded
> into bash's memory at start-up, so even after `git reset --hard` updates the
> file on disk, the old function definitions are already executing.  The bootstrap
> is three lines — it simply `exec bash "$REPO_DIR/ops/nexus_deploy.sh" "$@"`.
> Because bash starts a fresh process for every deploy, it always reads the latest
> code from the repo.

## 2a) Immediate fix — recovering from a stale installed deploy script

If the deploy script installed at `/usr/local/bin/nexus_deploy.sh` is an **old
copy** of the full script (pre-PR #385) and the deploy hangs or produces a line
like:

```
cat > '/opt/TheNexuStore/Frontend/Store/.env.production' <<MARKER
```

…then bash is hung waiting for the heredoc terminator (`MARKER`) on stdin —
it never arrives in non-interactive mode.  The root cause is that an old version
of `write_frontend_env_files` built the heredoc using `\n` escape sequences
inside a double-quoted string, so bash saw no real newlines and never found the
terminator.  The `printf`-based replacement (PR #385) and the self-update
mechanism (PR #386) are already in the repo, but they cannot help because the
*running installed copy* predates both fixes and is already loaded into bash
memory.  Kill the hanging process (Ctrl-C) and use one of the options below.

**Option A — run the repo script directly (immediate fix, no reinstall needed):**

```bash
sudo bash /opt/TheNexuStore/ops/nexus_deploy.sh
```

**Option B — reinstall the bootstrap then deploy as normal:**

```bash
cd /opt/TheNexuStore
git fetch --all --prune
git reset --hard origin/main
sudo install -m 755 ops/nexus_deploy_bootstrap.sh /usr/local/bin/nexus_deploy.sh
sudo /usr/local/bin/nexus_deploy.sh
```

After either option succeeds the installed script will be the bootstrap and
**all future `sudo /usr/local/bin/nexus_deploy.sh` runs will be immune to the
stale-copy problem** — every deploy automatically uses the current repo version.

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

If customer auth features are enabled, include:

```dotenv
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_CALLBACK_URL=https://api.thenexustore.com/auth/google/callback
MAIL_USER=<smtp-user>
MAIL_PASS=<smtp-password-or-app-password>
MAIL_HOST=<smtp-host> # optional, defaults to smtp.gmail.com
MAIL_PORT=<smtp-port> # optional, defaults to 465
MAIL_SECURE=<true|false> # optional, defaults by port
MAIL_FROM=<optional-from-address>
MAIL_FROM_NAME=NEXUS
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

If `nexus_deploy.sh` is not found, or is an outdated copy, update repo first and reinstall the bootstrap:

```bash
cd /opt/TheNexuStore
git fetch --all --prune
git checkout main
git reset --hard origin/main
sudo install -m 755 ops/nexus_deploy_bootstrap.sh /usr/local/bin/nexus_deploy.sh
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
8. Local health checks (ports 3000/3001/4000), including the real Infortisa provider probe

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

Health endpoint (must reflect the real provider state, not a local fallback). Expect JSON fields `healthy`, `provider`, `base_url`, `checked_at`, `auth_configured`, `latency_ms`, and `error_summary` on failures:

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

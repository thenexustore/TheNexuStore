#!/usr/bin/env bash
set -Eeuo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" || "${1:-}" == "-n" ]]; then
  DRY_RUN=1
fi

REPO_DIR="${REPO_DIR:-/opt/TheNexuStore}"
BRANCH="${BRANCH:-main}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/nexus_backups}"
BACKEND_DIR="$REPO_DIR/Backend/Store"
STORE_DIR="$REPO_DIR/Frontend/Store"
ADMIN_DIR="$REPO_DIR/Frontend/admin"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/root/nexus-backend.env}"
STORE_ENV_FILE="${STORE_ENV_FILE:-$STORE_DIR/.env.production}"
ADMIN_ENV_FILE="${ADMIN_ENV_FILE:-$ADMIN_DIR/.env.production}"

log() { echo "[$(date +'%F %T')] $*"; }
run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "[dry-run] $*"
    return 0
  fi
  eval "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] Missing command: $1" >&2
    exit 1
  }
}

install_deps() {
  local app_dir="$1"
  if [[ -f "$app_dir/package-lock.json" ]]; then
    run "cd '$app_dir' && npm ci"
  else
    run "cd '$app_dir' && npm install"
  fi
}

wait_for_url() {
  local url="$1"
  local retries="${2:-20}"
  for ((i = 1; i <= retries; i++)); do
    if curl -fsS "$url" >/dev/null; then
      log "Health check OK: $url"
      return 0
    fi
    sleep 2
  done

  log "Health check FAILED: $url"
  return 1
}

for cmd in git npm npx pm2 sed curl tar; do
  require_cmd "$cmd"
done

[[ -d "$REPO_DIR/.git" ]] || { echo "[ERROR] Missing git repo at $REPO_DIR" >&2; exit 1; }
[[ -f "$BACKEND_ENV_FILE" ]] || { echo "[ERROR] Missing backend env file: $BACKEND_ENV_FILE" >&2; exit 1; }

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
run "mkdir -p '$BACKUP_DIR'"
run "tar -czf '$BACKUP_DIR/repo_snapshot.tgz' -C '$(dirname "$REPO_DIR")' '$(basename "$REPO_DIR")'"

run "sed -i 's/\r$//' '$BACKEND_ENV_FILE'"
run "sed -i 's/\r$//' '$STORE_ENV_FILE' '$ADMIN_ENV_FILE'"

run "cd '$REPO_DIR' && git fetch --all --prune"
run "cd '$REPO_DIR' && git checkout '$BRANCH'"
run "cd '$REPO_DIR' && git reset --hard 'origin/$BRANCH'"
run "cd '$REPO_DIR' && git clean -fd"

set -a
# shellcheck disable=SC1090
source "$BACKEND_ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] DATABASE_URL is required in $BACKEND_ENV_FILE" >&2
  exit 1
fi

log "Building backend"
install_deps "$BACKEND_DIR"
run "cd '$BACKEND_DIR' && DATABASE_URL='$DATABASE_URL' npx prisma generate"
run "cd '$BACKEND_DIR' && DATABASE_URL='$DATABASE_URL' npx prisma migrate deploy"
run "cd '$BACKEND_DIR' && npm run build"

log "Building store"
install_deps "$STORE_DIR"
run "cd '$STORE_DIR' && npm run build"

log "Building admin"
install_deps "$ADMIN_DIR"
run "cd '$ADMIN_DIR' && npm run build"

log "Restarting PM2"
run "pm2 restart nexus-backend --update-env"
run "pm2 restart nexus-store --update-env"
run "pm2 restart nexus-admin --update-env"
run "pm2 save"

if [[ "$DRY_RUN" == "0" ]]; then
  wait_for_url "http://127.0.0.1:4000/admin/health"
  wait_for_url "http://127.0.0.1:4000/admin/infortisa/health"
  wait_for_url "http://127.0.0.1:3000"
  wait_for_url "http://127.0.0.1:3001"
fi

log "Deploy finished. Backup created at: $BACKUP_DIR"

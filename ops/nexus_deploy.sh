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
BACKEND_START_SCRIPT="${BACKEND_START_SCRIPT:-/usr/local/bin/nexus-backend-start.sh}"
STORE_ENV_FILE="${STORE_ENV_FILE:-$STORE_DIR/.env.production}"
ADMIN_ENV_FILE="${ADMIN_ENV_FILE:-$ADMIN_DIR/.env.production}"

log() { echo "[$(date +'%F %T')] $*"; }
run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "[dry-run] $*"
    return 0
  fi
  log "$*"
  eval "$*"
}

create_repo_backup() {
  local destination="$1"
  local parent_dir
  local repo_name

  parent_dir="$(dirname "$REPO_DIR")"
  repo_name="$(basename "$REPO_DIR")"

  run "tar -czf '$destination' -C '$parent_dir' \
    --exclude='$repo_name/.git' \
    --exclude='$repo_name/**/node_modules' \
    --exclude='$repo_name/**/.next' \
    --exclude='$repo_name/**/dist' \
    --exclude='$repo_name/**/coverage' \
    --exclude='$repo_name/**/.turbo' \
    --exclude='$repo_name/**/.cache' \
    '$repo_name'"
}

write_backend_start_script() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "[dry-run] writing backend start script to $BACKEND_START_SCRIPT"
    return 0
  fi

  cat > "$BACKEND_START_SCRIPT" <<SCRIPT
#!/usr/bin/env bash
set -Eeuo pipefail
cd "$BACKEND_DIR"
source "$BACKEND_ENV_FILE"
exec node dist/src/main.js
SCRIPT
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

fix_next_proxy_conflict() {
  local app_dir="$1"
  local middleware_file="$app_dir/middleware.ts"
  local proxy_file="$app_dir/proxy.ts"

  if [[ -f "$middleware_file" && -f "$proxy_file" ]]; then
    run "rm -f '$middleware_file'"
    log "Detected Next.js conflict in $app_dir (middleware.ts + proxy.ts). Removed middleware.ts"
  fi
}

pm2_has_process() {
  pm2 jlist | grep -q "\"name\":\"$1\""
}

restart_or_start_pm2() {
  local name="$1"
  local start_cmd="$2"

  if pm2_has_process "$name"; then
    run "pm2 restart '$name' --update-env"
  else
    run "$start_cmd"
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
create_repo_backup "$BACKUP_DIR/repo_snapshot.tgz"

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

log "Ensuring backend start script"
write_backend_start_script
run "chmod +x '$BACKEND_START_SCRIPT'"
run "sed -i 's/\\r$//' '$BACKEND_START_SCRIPT'"

log "Building store"
fix_next_proxy_conflict "$STORE_DIR"
install_deps "$STORE_DIR"
run "cd '$STORE_DIR' && npm run build"

log "Building admin"
fix_next_proxy_conflict "$ADMIN_DIR"
install_deps "$ADMIN_DIR"
run "cd '$ADMIN_DIR' && npm run build"

log "Restarting PM2"
run "pm2 delete nexus-frontend >/dev/null 2>&1 || true"
restart_or_start_pm2 "nexus-backend" "pm2 start '$BACKEND_START_SCRIPT' --name nexus-backend --time"
restart_or_start_pm2 "nexus-store" "pm2 start npm --name nexus-store --cwd '$STORE_DIR' -- start -- -p 3000"
restart_or_start_pm2 "nexus-admin" "pm2 start npm --name nexus-admin --cwd '$ADMIN_DIR' -- start -- -p 3001"
run "pm2 save"

if [[ "$DRY_RUN" == "0" ]]; then
  wait_for_url "http://127.0.0.1:4000/admin/health"
  wait_for_url "http://127.0.0.1:4000/admin/infortisa/health"
  wait_for_url "http://127.0.0.1:3000"
  wait_for_url "http://127.0.0.1:3001"
fi

log "Deploy finished. Backup created at: $BACKUP_DIR"

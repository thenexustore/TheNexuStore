#!/usr/bin/env bash
set -Eeuo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" || "${1:-}" == "-n" ]]; then
  DRY_RUN=1
fi

REPO_DIR="${REPO_DIR:-/opt/TheNexuStore}"
REPO_URL="${REPO_URL:-}"
FALLBACK_LOCAL_REPO="${FALLBACK_LOCAL_REPO:-}"
BRANCH="${BRANCH:-}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/nexus_backups}"
BACKEND_DIR="$REPO_DIR/Backend/Store"
STORE_DIR="$REPO_DIR/Frontend/Store"
ADMIN_DIR="$REPO_DIR/Frontend/admin"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/root/nexus-backend.env}"
BACKEND_START_SCRIPT="${BACKEND_START_SCRIPT:-/usr/local/bin/nexus-backend-start.sh}"
STORE_ENV_FILE="${STORE_ENV_FILE:-$STORE_DIR/.env.production}"
ADMIN_ENV_FILE="${ADMIN_ENV_FILE:-$ADMIN_DIR/.env.production}"
API_DOMAIN="${API_DOMAIN:-}"
SITE_DOMAIN="${SITE_DOMAIN:-}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-}"
SKIP_EXTERNAL_HEALTHCHECKS="${SKIP_EXTERNAL_HEALTHCHECKS:-1}"
SYNC_FRONTEND_ENV="${SYNC_FRONTEND_ENV:-1}"

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
[[ -f "$BACKEND_ENV_FILE" ]] || { echo "[ERROR] Missing backend env file: $BACKEND_ENV_FILE" >&2; exit 1; }
set -a
source "$BACKEND_ENV_FILE"
set +a
exec node dist/src/main.js
SCRIPT
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] Missing command: $1" >&2
    exit 1
  }
}

ensure_repo() {
  if [[ -d "$REPO_DIR/.git" ]]; then
    return 0
  fi

  if [[ -n "$REPO_URL" ]]; then
    run "mkdir -p '$(dirname "$REPO_DIR")'"
    run "git clone '$REPO_URL' '$REPO_DIR'"
    return 0
  fi

  if [[ -n "$FALLBACK_LOCAL_REPO" && -d "$FALLBACK_LOCAL_REPO/.git" ]]; then
    run "mkdir -p '$(dirname "$REPO_DIR")'"
    run "git clone '$FALLBACK_LOCAL_REPO' '$REPO_DIR'"
    return 0
  fi

  echo "[ERROR] Missing git repo at $REPO_DIR and no REPO_URL/FALLBACK_LOCAL_REPO provided" >&2
  exit 1
}

detect_branch() {
  if [[ -n "$BRANCH" ]]; then
    return 0
  fi

  if git -C "$REPO_DIR" show-ref --verify --quiet refs/remotes/origin/main; then
    BRANCH="main"
    return 0
  fi

  if git -C "$REPO_DIR" show-ref --verify --quiet refs/remotes/origin/master; then
    BRANCH="master"
    return 0
  fi

  BRANCH="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)"
}

ensure_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    return 0
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    log "[dry-run] pm2 not found. Would install globally with npm install -g pm2"
    return 0
  fi

  log "pm2 not found. Installing globally with npm"
  run "npm install -g pm2"
}

install_deps() {
  local app_dir="$1"
  local include_dev="${2:-0}"
  local install_cmd=""

  if [[ -f "$app_dir/package-lock.json" ]]; then
    install_cmd="npm ci"
  else
    install_cmd="npm install"
  fi

  if [[ "$include_dev" == "1" ]]; then
    install_cmd="$install_cmd --include=dev"
  fi

  run "cd '$app_dir' && $install_cmd"
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
  if ! command -v pm2 >/dev/null 2>&1; then
    return 1
  fi

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

for cmd in git npm npx sed curl tar; do
  require_cmd "$cmd"
done

ensure_pm2
ensure_repo
[[ -f "$BACKEND_ENV_FILE" ]] || { echo "[ERROR] Missing backend env file: $BACKEND_ENV_FILE" >&2; exit 1; }

detect_branch

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
run "mkdir -p '$BACKUP_DIR'"
create_repo_backup "$BACKUP_DIR/repo_snapshot.tgz"

run "sed -i 's/\r$//' '$BACKEND_ENV_FILE'"

run "cd '$REPO_DIR' && git fetch --all --prune"
if git -C "$REPO_DIR" show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  run "cd '$REPO_DIR' && git checkout '$BRANCH'"
  run "cd '$REPO_DIR' && git reset --hard 'origin/$BRANCH'"
  # Preserve persistent runtime storage (branding assets, settings) before cleaning.
  # The storage/ dir is listed in Backend/Store/.gitignore so git clean ignores it,
  # but we also back it up explicitly in case the gitignore is ever modified.
  BACKEND_STORAGE_DIR="$BACKEND_DIR/storage"
  if [[ -d "$BACKEND_STORAGE_DIR" ]]; then
    if ! cp -a "$BACKEND_STORAGE_DIR" "$BACKUP_DIR/storage_snapshot"; then
      echo "[ERROR] Could not backup backend storage to $BACKUP_DIR/storage_snapshot. Aborting to prevent data loss." >&2
      exit 1
    fi
  fi
  run "cd '$REPO_DIR' && git clean -fd"
  # Restore storage dir if git clean somehow removed it (e.g., if gitignore was absent)
  if [[ ! -d "$BACKEND_STORAGE_DIR" && -d "$BACKUP_DIR/storage_snapshot" ]]; then
    run "cp -a '$BACKUP_DIR/storage_snapshot' '$BACKEND_STORAGE_DIR'"
    log "Restored backend storage from backup snapshot"
  fi
else
  log "WARN: origin/$BRANCH not found. Using local branch state without hard reset."
  run "cd '$REPO_DIR' && git checkout '$BRANCH'"
fi

set -a
# shellcheck disable=SC1090
source "$BACKEND_ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] DATABASE_URL is required in $BACKEND_ENV_FILE" >&2
  exit 1
fi

DEPLOY_API_URL="${API_DOMAIN:-${BASE_URL:-}}"
DEPLOY_SITE_URL="${SITE_DOMAIN:-${FRONTEND_URL:-}}"
DEPLOY_ADMIN_URL="${ADMIN_DOMAIN:-${ADMIN_URL:-}}"

if [[ -z "$DEPLOY_API_URL" ]]; then
  DEPLOY_API_URL="https://api.thenexustore.com"
  log "WARN: API_DOMAIN/BASE_URL missing. Falling back to $DEPLOY_API_URL"
fi

if [[ -z "$DEPLOY_SITE_URL" ]]; then
  DEPLOY_SITE_URL="https://www.thenexustore.com"
  log "WARN: SITE_DOMAIN/FRONTEND_URL missing. Falling back to $DEPLOY_SITE_URL"
fi

if [[ -z "$DEPLOY_ADMIN_URL" ]]; then
  DEPLOY_ADMIN_URL="$DEPLOY_SITE_URL"
  log "WARN: ADMIN_DOMAIN/ADMIN_URL missing. Falling back to $DEPLOY_ADMIN_URL"
fi

if [[ "$SYNC_FRONTEND_ENV" == "1" ]]; then
  run "mkdir -p '$(dirname "$STORE_ENV_FILE")' '$(dirname "$ADMIN_ENV_FILE")'"
  run "cat > '$STORE_ENV_FILE' <<ENV
NEXT_PUBLIC_API_URL=$DEPLOY_API_URL
NEXT_PUBLIC_SITE_URL=$DEPLOY_SITE_URL
ENV"
  run "cat > '$ADMIN_ENV_FILE' <<ENV
NEXT_PUBLIC_API_URL=$DEPLOY_API_URL
NEXT_PUBLIC_SITE_URL=$DEPLOY_SITE_URL
ENV"
  run "sed -i 's/\r$//' '$STORE_ENV_FILE' '$ADMIN_ENV_FILE'"
else
  log "Skipping frontend env sync because SYNC_FRONTEND_ENV=$SYNC_FRONTEND_ENV"
fi

log "Building backend"
install_deps "$BACKEND_DIR" 1
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
run "cd '$STORE_DIR' && NODE_ENV=production npm run build"

log "Building admin"
fix_next_proxy_conflict "$ADMIN_DIR"
install_deps "$ADMIN_DIR"
run "cd '$ADMIN_DIR' && NODE_ENV=production npm run build"

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

  if [[ "$SKIP_EXTERNAL_HEALTHCHECKS" != "1" ]]; then
    wait_for_url "$DEPLOY_API_URL/admin/health"
    wait_for_url "$DEPLOY_SITE_URL"
    wait_for_url "$DEPLOY_ADMIN_URL"
  fi

  log "Running backend HTTP smoke checks"
  run "cd '$BACKEND_DIR' && BASE_URL='http://127.0.0.1:4000' npm run smoke:http"
fi

log "Deploy finished. Backup created at: $BACKUP_DIR"

#!/usr/bin/env bash
set -Eeuo pipefail

# TheNexuStore production deployment (ARSYS/Plesk-friendly)
# Goal: make /opt/TheNexuStore the single source of truth.

REPO_DIR="${REPO_DIR:-/opt/TheNexuStore}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
API_DOMAIN="${API_DOMAIN:-https://api.thenexustore.com}"
SITE_DOMAIN="${SITE_DOMAIN:-https://www.thenexustore.com}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/root/nexus-backend.env}"
BACKEND_START_SCRIPT="/usr/local/bin/nexus-backend-start.sh"
FALLBACK_LOCAL_REPO="${FALLBACK_LOCAL_REPO:-/opt/Nexus-Store}"
FORCE_SYNC_WITH_ORIGIN="${FORCE_SYNC_WITH_ORIGIN:-0}"
PREV_SHA=""

wait_for_url() {
  local url="$1"
  local retries="${2:-15}"
  local delay_s="${3:-2}"

  for ((i = 1; i <= retries; i++)); do
    if curl -fsS "$url" >/dev/null; then
      log "Health check OK: $url"
      return 0
    fi
    log "Waiting for health check ($i/$retries): $url"
    sleep "$delay_s"
  done

  log "Health check FAILED: $url"
  return 1
}

wait_for_port() {
  local host="$1"
  local port="$2"
  local retries="${3:-15}"
  local delay_s="${4:-2}"

  for ((i = 1; i <= retries; i++)); do
    if timeout 1 bash -c "</dev/tcp/${host}/${port}" >/dev/null 2>&1; then
      log "Port open: ${host}:${port}"
      return 0
    fi
    log "Waiting for port (${i}/${retries}): ${host}:${port}"
    sleep "$delay_s"
  done

  log "Port check FAILED: ${host}:${port}"
  return 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] Missing command: $1" >&2
    exit 1
  }
}

log() {
  echo "[$(date +'%F %T')] $*"
}

build_backend() {
  log "Installing/building backend"
  cd "$REPO_DIR/Backend/Store"
  npm ci
  DATABASE_URL="$DATABASE_URL" npx prisma generate
  DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
  npm run build
}

restart_backend() {
  log "Starting backend process via PM2"
  pm2 delete nexus-backend >/dev/null 2>&1 || true
  pm2 start "$BACKEND_START_SCRIPT" --name nexus-backend --time
}

rollback_backend() {
  if [[ -z "$PREV_SHA" ]]; then
    log "Rollback skipped: PREV_SHA is empty"
    return 1
  fi

  log "Rolling back backend to PREV_SHA=$PREV_SHA"
  cd "$REPO_DIR"
  git reset --hard "$PREV_SHA"
  git clean -fd

  pm2 stop nexus-backend >/dev/null 2>&1 || true
  build_backend
  restart_backend

  if ! wait_for_url "http://127.0.0.1:4000/admin/health" 15 2; then
    log "Rollback health check failed"
    pm2 logs nexus-backend --lines 120 --nostream || true
    return 1
  fi

  log "Rollback succeeded"
}

deploy_next_app() {
  local app_name="$1"
  local app_dir="$2"
  local port="$3"
  local smoke_url="$4"

  log "Deploying ${app_name} from ${app_dir}"
  cd "$app_dir"

  pm2 stop "$app_name" >/dev/null 2>&1 || true
  rm -rf .next
  npm ci
  npm run build

  if pm2 describe "$app_name" >/dev/null 2>&1; then
    pm2 restart "$app_name"
  else
    pm2 start npm --name "$app_name" --cwd "$app_dir" -- start -- -p "$port"
  fi

  wait_for_port "127.0.0.1" "$port" 20 2
  wait_for_url "$smoke_url" 20 2
}

log "Validating required commands"
for c in git npm npx pm2 sed curl timeout; do
  require_cmd "$c"
done

if [[ ! -d "$REPO_DIR/.git" ]]; then
  mkdir -p "$(dirname "$REPO_DIR")"

  if [[ -n "$REPO_URL" ]]; then
    log "Repository not found. Cloning $REPO_URL into $REPO_DIR"
    git clone "$REPO_URL" "$REPO_DIR" || {
      log "Remote clone failed. Trying local fallback: $FALLBACK_LOCAL_REPO"
      if [[ -d "$FALLBACK_LOCAL_REPO/.git" ]]; then
        git clone "$FALLBACK_LOCAL_REPO" "$REPO_DIR"
      else
        echo "[ERROR] Cannot clone from remote and fallback repo not found: $FALLBACK_LOCAL_REPO" >&2
        exit 1
      fi
    }
  elif [[ -d "$FALLBACK_LOCAL_REPO/.git" ]]; then
    log "REPO_URL not set. Bootstrapping from local repo: $FALLBACK_LOCAL_REPO"
    git clone "$FALLBACK_LOCAL_REPO" "$REPO_DIR"
  else
    echo "[ERROR] Repo not found in $REPO_DIR, REPO_URL is empty, and fallback repo missing: $FALLBACK_LOCAL_REPO" >&2
    echo "Set REPO_URL or provide local fallback repo." >&2
    exit 1
  fi
fi

if [[ ! -f "$BACKEND_ENV_FILE" ]]; then
  echo "[ERROR] Backend env file missing: $BACKEND_ENV_FILE" >&2
  exit 1
fi

log "Normalizing line endings in backend env"
sed -i 's/\r$//' "$BACKEND_ENV_FILE"

log "Loading backend env for build/migrations"
set -a
# shellcheck disable=SC1090
source "$BACKEND_ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' "$BACKEND_ENV_FILE" | tail -n 1 | sed 's/^"//; s/"$//')"
  export DATABASE_URL
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] DATABASE_URL is not set after loading $BACKEND_ENV_FILE" >&2
  exit 1
fi

log "Updating repository to branch $BRANCH"
cd "$REPO_DIR"
PREV_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
if [[ -n "$PREV_SHA" ]]; then
  log "Saved PREV_SHA=$PREV_SHA"
fi

git fetch --all --prune

if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  if [[ "$FORCE_SYNC_WITH_ORIGIN" == "1" ]]; then
    log "Force-sync enabled: hard resetting $BRANCH to origin/$BRANCH"
    git checkout -B "$BRANCH" "origin/$BRANCH"
    git reset --hard "origin/$BRANCH"
    git clean -fd
  else
    git checkout "$BRANCH"
    git pull --ff-only
  fi
else
  log "origin/$BRANCH not found; using local branch checkout"
  git checkout "$BRANCH"
fi

log "Writing backend start script at $BACKEND_START_SCRIPT"
cat > "$BACKEND_START_SCRIPT" <<SCRIPT
#!/usr/bin/env bash
set -Eeuo pipefail
cd "$REPO_DIR/Backend/Store"
source "$BACKEND_ENV_FILE"
exec node dist/src/main.js
SCRIPT
chmod +x "$BACKEND_START_SCRIPT"
sed -i 's/\r$//' "$BACKEND_START_SCRIPT"

pm2 stop nexus-backend >/dev/null 2>&1 || true
build_backend
restart_backend

if ! wait_for_url "http://127.0.0.1:4000/admin/health" 15 2; then
  log "Backend failed after deploy; attempting auto-rollback"
  pm2 logs nexus-backend --lines 120 --nostream || true
  if ! rollback_backend; then
    exit 1
  fi
fi

cat > "$REPO_DIR/Frontend/Store/.env.production" <<ENV
NEXT_PUBLIC_API_URL=$API_DOMAIN
NEXT_PUBLIC_SITE_URL=$SITE_DOMAIN
ENV
deploy_next_app "nexus-store" "$REPO_DIR/Frontend/Store" "3000" "http://127.0.0.1:3000"

cat > "$REPO_DIR/Frontend/admin/.env.production" <<ENV
NEXT_PUBLIC_API_URL=$API_DOMAIN
NEXT_PUBLIC_SITE_URL=$SITE_DOMAIN
ENV
deploy_next_app "nexus-admin" "$REPO_DIR/Frontend/admin" "3001" "http://127.0.0.1:3001"

log "Saving PM2 process list"
pm2 save

log "Basic checks"
pm2 status
wait_for_url "http://127.0.0.1:4000/admin/health" 10 2
wait_for_url "http://127.0.0.1:4000/admin/infortisa/health" 10 2
wait_for_url "$API_DOMAIN/admin/health" 10 2

log "Deployment complete. Source of truth is now: $REPO_DIR"

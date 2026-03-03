#!/usr/bin/env bash
set -Eeuo pipefail

# TheNexuStore production deployment (ARSYS/Plesk-friendly)
# Goal: make /opt/TheNexuStore the single source of truth.

REPO_DIR="${REPO_DIR:-/opt/TheNexuStore}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
API_DOMAIN="${API_DOMAIN:-https://api.thenexustore.com}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/root/nexus-backend.env}"
BACKEND_START_SCRIPT="/usr/local/bin/nexus-backend-start.sh"
FALLBACK_LOCAL_REPO="${FALLBACK_LOCAL_REPO:-/opt/Nexus-Store}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] Missing command: $1" >&2
    exit 1
  }
}

log() {
  echo "[$(date +'%F %T')] $*"
}

log "Validating required commands"
for c in git npm npx pm2 sed curl; do
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

log "Installing/building backend"
cd "$REPO_DIR/Backend/Store"
npm ci
DATABASE_URL="$DATABASE_URL" npx prisma generate
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
npm run build

log "Writing backend start script at $BACKEND_START_SCRIPT"
cat > "$BACKEND_START_SCRIPT" <<SCRIPT
#!/usr/bin/env bash
set -Eeuo pipefail
cd "$REPO_DIR/Backend/Store"
source "$BACKEND_ENV_FILE"
exec node dist/main.js
SCRIPT
chmod +x "$BACKEND_START_SCRIPT"
sed -i 's/\r$//' "$BACKEND_START_SCRIPT"

log "Deploying backend process via PM2"
pm2 delete nexus-backend >/dev/null 2>&1 || true
pm2 start "$BACKEND_START_SCRIPT" --name nexus-backend --time

log "Installing/building Store frontend"
cd "$REPO_DIR/Frontend/Store"
npm ci
cat > .env.production <<ENV
NEXT_PUBLIC_API_URL=$API_DOMAIN
ENV
npm run build
pm2 delete nexus-store >/dev/null 2>&1 || true
pm2 start npm --name nexus-store --cwd "$REPO_DIR/Frontend/Store" -- start -- -p 3000

log "Installing/building Admin frontend"
cd "$REPO_DIR/Frontend/admin"
npm ci
cat > .env.production <<ENV
NEXT_PUBLIC_API_URL=$API_DOMAIN
ENV
npm run build
pm2 delete nexus-admin >/dev/null 2>&1 || true
pm2 start npm --name nexus-admin --cwd "$REPO_DIR/Frontend/admin" -- start -- -p 3001

log "Saving PM2 process list"
pm2 save

log "Basic checks"
pm2 status
curl -fsS "http://127.0.0.1:4000/admin/health" >/dev/null && log "Backend health OK"
curl -fsS "http://127.0.0.1:4000/admin/infortisa/health" >/dev/null && log "Infortisa health OK"

log "Deployment complete. Source of truth is now: $REPO_DIR"

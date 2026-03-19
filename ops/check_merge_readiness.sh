#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WITH_BUILD=0

if [[ "${1:-}" == "--with-build" ]]; then
  WITH_BUILD=1
fi

run() {
  echo "[merge-readiness] $*"
  eval "$*"
}

cd "$REPO_ROOT"

echo "[merge-readiness] checking for merge markers"
if rg -n '^(<<<<<<<|=======|>>>>>>>)' Backend Frontend docs ops --glob '!**/node_modules/**' --glob '!**/.next/**'; then
  echo "[merge-readiness] merge markers found" >&2
  exit 1
fi


run "cd '$REPO_ROOT/Backend/Store' && npm run check:merge-markers"
run "cd '$REPO_ROOT/Backend/Store' && npm run typecheck"

run "cd '$REPO_ROOT/Frontend/Store' && npm run check:merge-markers"
run "cd '$REPO_ROOT/Frontend/Store' && npm run typecheck"

run "cd '$REPO_ROOT/Frontend/admin' && npm run check:merge-markers"
run "cd '$REPO_ROOT/Frontend/admin' && npm run typecheck"

if [[ "$WITH_BUILD" == "1" ]]; then
  run "cd '$REPO_ROOT/Backend/Store' && npm run build"
  run "cd '$REPO_ROOT/Frontend/Store' && npm run build"
  run "cd '$REPO_ROOT/Frontend/admin' && npm run build"
fi

echo "[merge-readiness] OK"

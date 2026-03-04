#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/root/nexus_backups}"
REPO_DIR="${REPO_DIR:-/opt/TheNexuStore}"
TARGET_BACKUP="${1:-}"

log() { echo "[$(date +'%F %T')] $*"; }

if [[ -z "$TARGET_BACKUP" ]]; then
  TARGET_BACKUP="$(ls -1dt "$BACKUP_ROOT"/* 2>/dev/null | head -n 1 || true)"
fi

[[ -n "$TARGET_BACKUP" ]] || { echo "[ERROR] No backup directory found in $BACKUP_ROOT" >&2; exit 1; }
[[ -f "$TARGET_BACKUP/repo_snapshot.tgz" ]] || { echo "[ERROR] Backup tar not found: $TARGET_BACKUP/repo_snapshot.tgz" >&2; exit 1; }

log "Restoring from $TARGET_BACKUP"
rm -rf "$REPO_DIR"
mkdir -p "$(dirname "$REPO_DIR")"
tar -xzf "$TARGET_BACKUP/repo_snapshot.tgz" -C "$(dirname "$REPO_DIR")"

pm2 restart nexus-backend --update-env
pm2 restart nexus-store --update-env
pm2 restart nexus-admin --update-env
pm2 save

log "Rollback completed"

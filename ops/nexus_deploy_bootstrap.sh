#!/usr/bin/env bash
# Minimal bootstrap installed at /usr/local/bin/nexus_deploy.sh
#
# This file never contains deploy logic — it only delegates to the versioned
# deploy script inside the repo.  Because it is trivially small it rarely needs
# to be updated, which eliminates the "stale installed copy" bootstrapping
# problem that occurs when the full deploy script is installed directly.
#
# One-time setup (run once on the server, then never again):
#   sudo install -m 755 ops/nexus_deploy_bootstrap.sh /usr/local/bin/nexus_deploy.sh
#
# After that, every `sudo /usr/local/bin/nexus_deploy.sh` transparently runs
# whatever version of ops/nexus_deploy.sh the repo currently has checked out.
#
# NOTE: `bash` is hardcoded here intentionally.  nexus_deploy.sh uses bash-
# specific features (arrays, [[ ]], process substitution, etc.) that are
# incompatible with /bin/sh.  Hardcoding bash guarantees correct behaviour
# regardless of the server's default shell or the script's shebang line.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/TheNexuStore}"
_script="$REPO_DIR/ops/nexus_deploy.sh"

if [[ ! -f "$_script" ]]; then
  echo "[ERROR] Deploy script not found: $_script" >&2
  echo "        Clone the repo to REPO_DIR=$REPO_DIR or set REPO_DIR to the correct path." >&2
  exit 1
fi

exec bash "$_script" "$@"

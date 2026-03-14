#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"
TARGET_PATH="${TARGET_PATH:-/home-composer}"
TARGET_URL="http://127.0.0.1:${PORT}${TARGET_PATH}"
ARTIFACT_PATH="${ARTIFACT_PATH:-artifacts/home-composer-automated.png}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-45}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-$TARGET_URL}"

cleanup() {
  if [[ -n "${DEV_PID:-}" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

cd "$ROOT_DIR"
mkdir -p "$(dirname "$ARTIFACT_PATH")"

echo "[1/4] Starting admin dev server on ${HOST}:${PORT} ..."
npm --prefix Frontend/admin run dev -- --hostname "$HOST" --port "$PORT" > /tmp/home-composer-dev.log 2>&1 &
DEV_PID=$!

echo "[2/4] Waiting for ${HEALTH_CHECK_URL} ..."
SECONDS_WAITED=0
until curl -sS -o /dev/null "$HEALTH_CHECK_URL"; do
  sleep 1
  SECONDS_WAITED=$((SECONDS_WAITED + 1))
  if [[ "$SECONDS_WAITED" -ge "$TIMEOUT_SECONDS" ]]; then
    echo "Timeout waiting for admin route ${HEALTH_CHECK_URL}"
    echo "--- Dev server log ---"
    cat /tmp/home-composer-dev.log || true
    exit 1
  fi
done

echo "[3/4] Route is up. Capturing screenshot ..."
if python -c "import playwright" >/dev/null 2>&1; then
  python - <<PY
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("${TARGET_URL}", wait_until="networkidle", timeout=30000)
        await page.screenshot(path="${ARTIFACT_PATH}", full_page=True)
        await browser.close()

asyncio.run(main())
PY
elif command -v npx >/dev/null 2>&1 && npx --yes playwright --version >/dev/null 2>&1; then
  if ! npx --yes playwright screenshot --wait-for-timeout=1500 --full-page "$TARGET_URL" "$ARTIFACT_PATH"; then
    FALLBACK_HTML="${ARTIFACT_PATH%.png}.html"
    echo "[WARN] npx playwright is present but browsers/runtime are not ready."
    echo "[WARN] Saving HTML fallback at ${FALLBACK_HTML}."
    curl -sS "$TARGET_URL" > "$FALLBACK_HTML"
  fi
else
  FALLBACK_HTML="${ARTIFACT_PATH%.png}.html"
  echo "[WARN] Playwright not available (python module or npx package)."
  echo "[WARN] Saving HTML fallback at ${FALLBACK_HTML}."
  curl -sS "$TARGET_URL" > "$FALLBACK_HTML"
fi

echo "[4/4] Validation finished. Artifact target: ${ARTIFACT_PATH}"

#!/usr/bin/env bash
# Starts backend (3001) + Metro (0.0.0.0:8081) for testing on a physical device.
# Requires: MongoDB running, backend/.env valid, DEV_API_HOST set in src/config/api.js

set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GiderTakipApp — phone dev (backend + Metro)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Mac LAN IP (Wi-Fi): ${LAN_IP:-unknown}"
echo "  src/config/api.js → DEV_API_HOST must match this IP on phone."
echo "  Metro URL on phone if needed: ${LAN_IP:-YOUR_IP}:8081"
echo ""
echo "  MongoDB must be running. Ctrl+C stops backend and Metro."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cleanup() {
  echo ""
  echo "Stopping backend and Metro..."
  kill "${BACKEND_PID:-0}" 2>/dev/null || true
  kill "${METRO_PID:-0}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "${ROOT}/backend" && node index.js) &
BACKEND_PID=$!
sleep 0.7

npx react-native start --host 0.0.0.0 &
METRO_PID=$!

wait "${METRO_PID}" || true

#!/usr/bin/env bash
# Cursor 미리보기 말고, 일반 Chrome 창으로 POKA를 엽니다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${POKA_URL:-http://127.0.0.1:43123}"
PROFILE="${POKA_CHROME_PROFILE:-$HOME/.poka-chrome-profile}"

cd "$ROOT"

if ! curl -sf --max-time 2 "$URL" >/dev/null; then
  if command -v tmux >/dev/null 2>&1; then
    tmux has-session -t poka-dev 2>/dev/null || tmux new-session -d -s poka-dev -c "$ROOT" -- bash -lc "npm run dev"
  else
    npm run dev >/tmp/poka-dev.log 2>&1 &
  fi
  for _ in $(seq 1 50); do
    if curl -sf --max-time 1 "$URL" >/dev/null; then
      break
    fi
    sleep 0.4
  done
fi

if ! curl -sf --max-time 2 "$URL" >/dev/null; then
  echo "서버가 아직 안 켜졌습니다. 터미널에서 npm run dev 후 다시 실행하세요." >&2
  echo "$URL"
  exit 1
fi

mkdir -p "$PROFILE"
CHROME="$(command -v google-chrome-stable || true)"
if [[ -z "$CHROME" ]]; then CHROME="$(command -v google-chrome || true)"; fi
if [[ -z "$CHROME" ]]; then CHROME="$(command -v chromium-browser || true)"; fi
if [[ -z "$CHROME" ]]; then CHROME="$(command -v chromium || true)"; fi

if [[ -n "$CHROME" ]]; then
  exec "$CHROME" \
    --user-data-dir="$PROFILE" \
    --no-first-run \
    --no-default-browser-check \
    --app="$URL"
fi

if command -v xdg-open >/dev/null 2>&1; then
  exec xdg-open "$URL"
fi
if command -v open >/dev/null 2>&1; then
  exec open "$URL"
fi

echo "브라우저를 찾지 못했습니다. 주소: $URL" >&2
exit 1

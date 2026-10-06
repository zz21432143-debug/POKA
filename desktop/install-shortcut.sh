#!/usr/bin/env bash
# 바탕화면에 POKA 바로가기를 만듭니다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$ROOT/desktop/open-poka.sh"

DESKTOP="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
if [[ ! -d "$DESKTOP" ]]; then
  DESKTOP="$HOME/Desktop"
  mkdir -p "$DESKTOP"
fi

ICON="$ROOT/public/brand/poka-mark.svg"
FILE="$DESKTOP/POKA.desktop"

cat > "$FILE" <<EOF
[Desktop Entry]
Type=Application
Name=POKA
Comment=홀덤 커뮤니티 (Cursor 미리보기 아님)
Exec=$ROOT/desktop/open-poka.sh
Icon=$ICON
Terminal=false
Categories=Network;
StartupNotify=true
EOF

chmod +x "$FILE"
if command -v gio >/dev/null 2>&1; then
  gio set "$FILE" metadata::trusted true 2>/dev/null || true
fi

echo "바탕화면에 POKA 바로가기를 만들었습니다: $FILE"
echo "더블클릭하면 Chrome 앱 창으로 열립니다."

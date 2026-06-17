#!/usr/bin/env bash
# Рендер одного Remotion-рилса по хук-конфигу — для вызова заводом (n8n Execute Command).
#
# Использование:
#   tools/factory_render.sh <id> '<hookJson>'
# где hookJson — массив карточек хука, например:
#   [{"label":"Понедельник","line":"Гречка.","size":150},{"label":"Среда","line":"Опять гречка.","size":112}]
#
# Печатает в stdout путь к готовому MP4 (его n8n кладёт в video_url).
set -euo pipefail

ID="${1:?нужен id}"
HOOK="${2:?нужен hookJson}"

REMOTION_DIR="$(cd "$(dirname "$0")/../remotion" && pwd)"
PROPS="/tmp/props_${ID}.json"
OUT="${REMOTION_DIR}/out/reel_${ID}.mp4"

printf '{"hook":%s}' "$HOOK" > "$PROPS"
# логи рендера — в stderr, чтобы stdout остался чистым (только путь)
node "${REMOTION_DIR}/render_one.mjs" "$PROPS" "$OUT" 1>&2
echo "$OUT"

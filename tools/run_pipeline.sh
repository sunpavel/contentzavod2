#!/usr/bin/env bash
# Полный автономный прогон завода: майнинг → бриф → сценарист → рендер (+публикация).
# Нужно в окружении: ENSEMBLEDATA_TOKEN и (DEEPSEEK_API_KEY | ANTHROPIC_API_KEY).
# Использование: tools/run_pipeline.sh [N] [demo|creator]   (N — сколько роликов; формат)
#   Формат можно задать и через env FORMAT. demo — промо-ролик; creator — UGC «ИИ-персонаж рассказывает».
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
N="${1:-3}"
FORMAT="${2:-${FORMAT:-demo}}"
case "$FORMAT" in
  creator) COMP="CreatorReel" ;;
  demo)    COMP="DemoReel" ;;
  *) echo "неизвестный формат: $FORMAT (demo|creator)"; exit 1 ;;
esac

echo "▶ 1/4 Майнинг трендов (EnsembleData)…"
node "$ROOT/tools/mine_ensembledata.mjs"

echo "▶ 2/4 Бриф из тренда (LLM)…"
node "$ROOT/tools/extract_brief.mjs"

echo "▶ 3/4 Сценарист → $N спек ($FORMAT, LLM)…"
node "$ROOT/remotion/scriptwriter.mjs" "$ROOT/mining/brief.json" "$N" "$FORMAT"

echo "▶ 4/4 Рендер $COMP (+ публикация, если задан агрегатор)…"
PUBLISHER=""
if [ -n "${BLOTATO_API_KEY:-}" ]; then PUBLISHER="blotato";
elif [ -n "${POSTIZ_API_KEY:-}" ] && [ -n "${POSTIZ_URL:-}" ]; then PUBLISHER="postiz"; fi
i=0
for f in "$ROOT"/remotion/run/*.json; do
  out="$ROOT/remotion/out/reel_run_${i}.mp4"
  echo "  → $(basename "$f") → $(basename "$out") [$COMP]"
  node "$ROOT/remotion/render_one.mjs" "$f" "$out" "$COMP"
  if [ -n "$PUBLISHER" ]; then
    cap=$(node "$ROOT/tools/build_caption.mjs" "$f")
    echo "  ▶ публикую ($PUBLISHER)…"
    if [ "$PUBLISHER" = "blotato" ]; then
      node "$ROOT/tools/publish_blotato.mjs" "$out" "$cap" || echo "  ⚠ публикация не удалась"
    else
      node "$ROOT/tools/publish_postiz.mjs" "$out" "$cap" now || echo "  ⚠ публикация не удалась"
    fi
  fi
  i=$((i + 1))
done
if [ -n "$PUBLISHER" ]; then
  echo "✅ Готово: $i роликов отрендерено и опубликовано ($PUBLISHER)"
else
  echo "✅ Готово: $i роликов в remotion/out/ (публикация пропущена — нет ключей агрегатора)"
fi

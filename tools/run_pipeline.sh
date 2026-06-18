#!/usr/bin/env bash
# Полный автономный прогон завода: майнинг → бриф → сценарист → рендер.
# Нужно в окружении: ENSEMBLEDATA_TOKEN и (DEEPSEEK_API_KEY | ANTHROPIC_API_KEY).
# Использование: tools/run_pipeline.sh [N]   (N — сколько роликов, по умолчанию 3)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
N="${1:-3}"

echo "▶ 1/4 Майнинг трендов (EnsembleData)…"
node "$ROOT/tools/mine_ensembledata.mjs"

echo "▶ 2/4 Бриф из тренда (LLM)…"
node "$ROOT/tools/extract_brief.mjs"

echo "▶ 3/4 Сценарист → $N спек (LLM)…"
node "$ROOT/remotion/scriptwriter.mjs" "$ROOT/mining/brief.json" "$N"

echo "▶ 4/4 Рендер (+ публикация в Postiz, если заданы ключи)…"
PUBLISH=""
if [ -n "${POSTIZ_API_KEY:-}" ] && [ -n "${POSTIZ_URL:-}" ]; then PUBLISH="yes"; fi
i=0
for f in "$ROOT"/remotion/run/*.json; do
  out="$ROOT/remotion/out/reel_run_${i}.mp4"
  echo "  → $(basename "$f") → $(basename "$out")"
  node "$ROOT/remotion/render_one.mjs" "$f" "$out"
  if [ -n "$PUBLISH" ]; then
    cap=$(node -e "const s=require(process.argv[1]); const h=(s.hook||[]).map(x=>x.line).join(' '); const cta=(s.ctaTitle||'').replace(/\n/g,' '); process.stdout.write(h+'\n\n'+cta+'\n\nAI-план питания и список покупок -> @foodgenius_ai_bot\n#рецепты #чтоприготовить #ужин #mealprep')" "$f")
    echo "  ▶ публикую в Postiz…"
    node "$ROOT/tools/publish_postiz.mjs" "$out" "$cap" now || echo "  ⚠ публикация не удалась"
  fi
  i=$((i + 1))
done
if [ -n "$PUBLISH" ]; then
  echo "✅ Готово: $i роликов отрендерено и опубликовано (Postiz)"
else
  echo "✅ Готово: $i роликов в remotion/out/ (публикация пропущена — нет POSTIZ_URL/POSTIZ_API_KEY)"
fi

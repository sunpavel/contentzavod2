#!/usr/bin/env bash
# Трек «настоящий человек» (HeyGen): аналитика трендов → сценарист пишет монолог с ХУКОМ →
# HeyGen генерит говорящего человека → рендер RealCreatorReel → публикация.
# Нужно: ENSEMBLEDATA_TOKEN, DEEPSEEK_API_KEY, HEYGEN_* , BLOTATO_* .
# Использование: tools/run_avatar_pipeline.sh [N]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
N="${1:-1}"

echo "▶ 1/5 Майнинг трендов…"
node "$ROOT/tools/mine_ensembledata.mjs"
if ! node -e "const w=require('$ROOT/mining/winners.json');process.exit(Array.isArray(w)&&w.length?0:1)" 2>/dev/null; then
  echo "⏭  Пропускаю: нет трендов и кэша (лимит EnsembleData)."; exit 0
fi

echo "▶ 2/5 Бриф из тренда…"
node "$ROOT/tools/extract_brief.mjs"

echo "▶ 3/5 Сценарист → $N скрипт(ов) для HeyGen (с хуком)…"
node "$ROOT/remotion/scriptwriter.mjs" "$ROOT/mining/brief.json" "$N" avatar

PUBLISHER=""
if [ -n "${BLOTATO_API_KEY:-}" ]; then PUBLISHER="blotato"; fi

i=0
for f in "$ROOT"/remotion/run/*.json; do
  echo "▶ 4/5 [$i] HeyGen — генерю говорящего человека…"
  SCRIPT=$(node -e "process.stdout.write(require('$f').script||'')")
  [ -z "$SCRIPT" ] && { echo "  ⚠ пустой script, пропуск"; i=$((i+1)); continue; }
  node "$ROOT/tools/gen_avatar.mjs" "$SCRIPT" "$ROOT/remotion/public/avatar_talk.mp4" || { echo "  ⚠ HeyGen не отдал видео, пропуск"; i=$((i+1)); continue; }

  echo "▶ 5/5 [$i] Рендер RealCreatorReel + публикация…"
  out="$ROOT/remotion/out/real_run_${i}.mp4"
  props=$(node -e "const s=require('$f'),m=require('$ROOT/remotion/public/avatar_talk.json');process.stdout.write(JSON.stringify({ctaTitle:s.ctaTitle,accent:s.accent,avatarSrc:'avatar_talk.mp4',avatarFrames:m.frames}))")
  echo "$props" > "/tmp/rcprops_${i}.json"
  node "$ROOT/remotion/render_one.mjs" "/tmp/rcprops_${i}.json" "$out" RealCreatorReel
  if [ -n "$PUBLISHER" ]; then
    cap=$(node "$ROOT/tools/build_caption.mjs" "$f")
    node "$ROOT/tools/publish_blotato.mjs" "$out" "$cap" || echo "  ⚠ публикация не удалась"
  fi
  i=$((i + 1))
done
echo "✅ Готово: $i роликов «настоящий человек»"

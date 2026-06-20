#!/usr/bin/env bash
# Запуск завода по расписанию (ограниченный объём). Вызывается из cron / n8n.
# Использование: tools/scheduled_run.sh <slot> [demo|creator|avatar|text|target] [N]
#   slot   — morning|noon|evening (для target определяет позицию в ротации)
#   format — target (ниша×площадка из ротации, РЕКОМЕНДУЕТСЯ) | avatar | demo | creator | text
#   N      — сколько единиц за слот (для не-target), по умолчанию 1
# Ключи берём из .env в корне репозитория (в git НЕ коммитится).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLOT="${1:-slot}"
FORMAT="${2:-demo}"
N="${3:-1}"

# подгрузить .env (ключи: ENSEMBLEDATA_TOKEN, DEEPSEEK_API_KEY, BLOTATO_*, …)
# `|| true` — кривая строка в .env не должна ронять слот под set -e
if [ -f "$ROOT/.env" ]; then set -a; . "$ROOT/.env" || true; set +a; fi

mkdir -p "$ROOT/logs"
LOG="$ROOT/logs/zavod_$(date +%F).log"
STAMP="$(date '+%F %T %Z')"
echo "===== [$STAMP] slot=$SLOT format=$FORMAT N=$N =====" | tee -a "$LOG"

# LLM-ключ нужен всегда (генерация). EnsembleData — только для старых майнинг-форматов.
if [ -z "${DEEPSEEK_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then echo "✗ нет LLM-ключа в .env" | tee -a "$LOG"; exit 1; fi

if [ "$FORMAT" = "target" ]; then
  # ниша × площадка из ротации (позиция слота)
  case "$SLOT" in morning) si=0;; noon) si=1;; evening) si=2;; *) si=0;; esac
  TARGET="$(node "$ROOT/tools/next_target.mjs" "$si")"
  echo "цель слота (ротация): $TARGET" | tee -a "$LOG"
  node "$ROOT/tools/run_target.mjs" $TARGET 2>&1 | tee -a "$LOG"
elif [ "$FORMAT" = "text" ]; then
  "$ROOT/tools/run_text_pipeline.sh" "$N" 2>&1 | tee -a "$LOG"
elif [ "$FORMAT" = "avatar" ]; then
  "$ROOT/tools/run_avatar_pipeline.sh" "$N" 2>&1 | tee -a "$LOG"
else
  if [ -z "${ENSEMBLEDATA_TOKEN:-}" ]; then echo "⚠ нет ENSEMBLEDATA_TOKEN — формат $FORMAT может пропустить слот" | tee -a "$LOG"; fi
  FORMAT="$FORMAT" "$ROOT/tools/run_pipeline.sh" "$N" "$FORMAT" 2>&1 | tee -a "$LOG"
fi
echo "===== [$(date '+%F %T %Z')] slot=$SLOT done =====" | tee -a "$LOG"

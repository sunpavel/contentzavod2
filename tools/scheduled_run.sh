#!/usr/bin/env bash
# Запуск завода по расписанию (ограниченный объём). Вызывается из cron / n8n.
# Использование: tools/scheduled_run.sh <slot> [demo|creator|text] [N]
#   slot   — метка слота для лога (morning|noon|evening|…)
#   format — demo (промо-видео) | creator (UGC-видео) | text (текстовые посты Threads+IG); по умолчанию demo
#   N      — сколько единиц за слот (ограниченный объём), по умолчанию 1
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

# Защита от пустых ключей — иначе зря крутим
if [ -z "${ENSEMBLEDATA_TOKEN:-}" ]; then echo "✗ нет ENSEMBLEDATA_TOKEN в .env" | tee -a "$LOG"; exit 1; fi
if [ -z "${DEEPSEEK_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then echo "✗ нет LLM-ключа в .env" | tee -a "$LOG"; exit 1; fi

if [ "$FORMAT" = "text" ]; then
  "$ROOT/tools/run_text_pipeline.sh" "$N" 2>&1 | tee -a "$LOG"
else
  FORMAT="$FORMAT" "$ROOT/tools/run_pipeline.sh" "$N" "$FORMAT" 2>&1 | tee -a "$LOG"
fi
echo "===== [$(date '+%F %T %Z')] slot=$SLOT done =====" | tee -a "$LOG"

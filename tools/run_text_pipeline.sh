#!/usr/bin/env bash
# Текстовый трек завода: аналитика Threads → короткие провокационные посты → публикация
# в Threads (чистый текст) и Instagram (карточка-картинка + подпись).
# Нужно: ENSEMBLEDATA_TOKEN (опц., есть кэш), DEEPSEEK_API_KEY, BLOTATO_API_KEY/ACCOUNTS.
# Использование: tools/run_text_pipeline.sh [N]   (N — сколько постов, по умолчанию 1)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
N="${1:-1}"

echo "▶ 1/3 Аналитика Threads (залетевшие посты)…"
node "$ROOT/tools/mine_threads.mjs" || echo "  ⚠ майнер Threads недоступен — беру кэш mining/threads_winners.json"

echo "▶ 2/3 Генерация $N текстовых постов (LLM)…"
node "$ROOT/tools/gen_text_posts.mjs" "$N"

echo "▶ 3/3 Публикация (Threads + Instagram)…"
if [ -z "${BLOTATO_API_KEY:-}" ]; then
  echo "  ⚠ нет BLOTATO_API_KEY — посты готовы в mining/text_posts.json, публикация пропущена"
  exit 0
fi
i=0
while [ "$i" -lt "$N" ]; do
  echo "  ▶ публикую пост $i…"
  node "$ROOT/tools/publish_text.mjs" "$i" || echo "  ⚠ пост $i: публикация частично не удалась"
  i=$((i + 1))
done
echo "✅ Готово: $N текстовых постов"

#!/usr/bin/env bash
# ── Развёртывание контент-завода FoodGenius на постоянном сервере (Debian/Ubuntu) ──
# Идемпотентно: можно запускать повторно. Ставит cron, зависимости Remotion (+ headless-
# браузер для рендера видео), node-модули, расписание из deploy/crontab и стартует cron.
#
# Использование:
#   1) git clone <repo> && cd contentzavod2
#   2) cp .env.example .env && отредактируй .env (ключи: DEEPSEEK_API_KEY, ENSEMBLEDATA_TOKEN,
#      BLOTATO_API_KEY, BLOTATO_ACCOUNTS)
#   3) sudo bash deploy/install.sh
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

echo "▶ Репозиторий: $REPO"

# 1) node
if ! command -v node >/dev/null 2>&1; then
  echo "✗ node не найден. Поставь Node.js 20+ (nvm или nodesource) и запусти снова."; exit 1
fi
NODEDIR="$(dirname "$(command -v node)")"
echo "✓ node: $(node -v) ($NODEDIR)"

# 2) системные пакеты: cron + библиотеки для headless-Chromium (рендер Remotion)
echo "▶ Системные пакеты (cron + зависимости Remotion)…"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -y >/dev/null 2>&1 || true
$SUDO apt-get install -y \
  cron ca-certificates fonts-liberation \
  libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libgbm1 libasound2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libpango-1.0-0 libcairo2 libxshmfence1 >/dev/null 2>&1 \
  || echo "  ⚠ apt частично не отработал — проверь вручную, если рендер упадёт"

# 3) node-модули Remotion + headless-браузер
echo "▶ npm install (remotion)…"
( cd "$REPO/remotion" && npm install --no-audit --no-fund >/dev/null 2>&1 && \
  npx remotion browser ensure >/dev/null 2>&1 && echo "✓ remotion готов (браузер скачан)" ) \
  || echo "  ⚠ npm/remotion: проверь логи, если видео-слоты падают"

# 4) .env
if [ ! -f "$REPO/.env" ]; then
  echo "✗ нет $REPO/.env — скопируй из .env.example и впиши ключи, затем запусти снова."; exit 1
fi
echo "✓ .env на месте"
if ! grep -q "BLOTATO_API_KEY=blt" "$REPO/.env" 2>/dev/null; then
  echo "  ⚠ в .env, похоже, не вписан BLOTATO_API_KEY — публикация не пойдёт"
fi

# 5) crontab из deploy/crontab (с правильным путём репозитория и PATH к node)
echo "▶ Устанавливаю расписание…"
CRON_TMP="$(mktemp)"
sed -e "s#/home/user/contentzavod2#$REPO#g" \
    -e "s#^PATH=.*#PATH=$NODEDIR:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin#" \
    "$REPO/deploy/crontab" > "$CRON_TMP"
crontab "$CRON_TMP"
rm -f "$CRON_TMP"
echo "✓ crontab установлен:"; crontab -l | grep -vE '^\s*#' | grep -vE '^\s*$' | sed 's/^/    /'

# 6) запустить cron
echo "▶ Запускаю cron…"
$SUDO systemctl enable --now cron 2>/dev/null || $SUDO service cron start 2>/dev/null || $SUDO cron 2>/dev/null || true
if pgrep -x cron >/dev/null 2>&1; then echo "✓ cron работает (pid $(pgrep -x cron | head -1))"; else echo "  ⚠ не вижу процесс cron — запусти вручную: service cron start"; fi

echo ""
echo "✅ Готово. Расписание (МСК): 08:00 demo-видео · 12:30 текст(Threads+IG) · 17:50 creator-видео."
echo "   Логи: $REPO/logs/zavod_<дата>.log   Проверить: crontab -l   Тест слота: tools/scheduled_run.sh test text 1"

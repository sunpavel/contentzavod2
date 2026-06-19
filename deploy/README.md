# Развёртывание на постоянном сервере

Контейнер разработки эфемерный — для автопилота 24/7 разверни завод на своём сервере.
Лучший таргет — недозагруженный сервер с запасом CPU/RAM (рендер видео — CPU-ёмкий).

## Вариант A — Docker, изолированно рядом с n8n (рекомендую) 🐳

«Экранирование» на общем сервере = **отдельный контейнер**: своя ФС, свои зависимости,
ноль пересечений с n8n. Сервер уже c Docker (под n8n) — ничего лишнего ставить не надо.

```bash
git clone <repo> && cd contentzavod2
cp .env.example .env            # вписать ключи: DEEPSEEK_API_KEY, ENSEMBLEDATA_TOKEN,
                                #                BLOTATO_API_KEY, BLOTATO_ACCOUNTS
docker compose -f deploy/docker-compose.yml up -d --build
docker compose -f deploy/docker-compose.yml logs -f      # смотреть слоты
```

Что внутри (`deploy/Dockerfile` + `deploy/scheduler.mjs`):
- образ с Node 22 + Remotion + **headless-браузер и все системные либы для рендера**;
- один процесс-планировщик: слоты по МСК (`08:00 demo` · `12:30 text` · `17:50 creator`), логи в `docker logs`;
- ключи **не зашиты в образ** — приходят из `.env` через `env_file` при запуске;
- `restart: unless-stopped` — переживает перезагрузки сервера.

Обновить после изменений: `docker compose -f deploy/docker-compose.yml up -d --build`.
Пауза: `docker compose -f deploy/docker-compose.yml down`. Ручной слот:
`docker compose -f deploy/docker-compose.yml exec factory bash tools/scheduled_run.sh test text 1`.

## Вариант B — cron на хосте (без Docker)

```bash
git clone <repo> && cd contentzavod2
cp .env.example .env
# нужен Node 20+ на хосте (если нет: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt-get install -y nodejs)
sudo bash deploy/install.sh     # cron + зависимости Remotion + браузер + расписание + старт
```

`install.sh` идемпотентный: ставит cron и системные либы рендера, `npm install`, скачивает браузер,
генерит crontab из `deploy/crontab` с правильным путём и PATH, запускает cron.
Эксплуатация: `crontab -l`, `tail -f logs/zavod_$(date +%F).log`, пауза — `crontab -r`.

## Вариант C — n8n (если уже крутишь его)

3 ноды **Schedule Trigger** (`0 8 * * *`, `30 12 * * *`, `50 17 * * *`, TZ `Europe/Moscow`) →
**Execute Command** на `tools/scheduled_run.sh noon text 1` (смонтируй репозиторий в контейнер n8n
и поставь туда node + зависимости Remotion).

## Расписание и форматы

МСК: **08:00** demo-видео · **12:30** текст (Threads+IG) · **17:50** creator-видео.
Менять время/формат/объём: Docker — `deploy/scheduler.mjs`; cron — `deploy/crontab`.
Форматы: `demo` (промо-видео) · `creator` (UGC-видео) · `text` (Threads+Instagram).

## Безопасность
Ключи — только в `.env` (он в `.gitignore` и в `.dockerignore`, в репозиторий/образ не попадает). В коде ключей нет.

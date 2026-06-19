# Развёртывание на постоянном сервере

Контейнер разработки эфемерный — для автопилота 24/7 разверни завод на своём сервере.

## Вариант A — один скрипт (cron, рекомендую)

```bash
git clone <repo> && cd contentzavod2
cp .env.example .env            # впиши ключи: DEEPSEEK_API_KEY, ENSEMBLEDATA_TOKEN,
                                #              BLOTATO_API_KEY, BLOTATO_ACCOUNTS
sudo bash deploy/install.sh     # ставит cron + зависимости Remotion + браузер, расписание, старт
```

`install.sh` идемпотентный (можно перезапускать). Он:
- ставит `cron` и системные библиотеки для headless-рендера видео (Remotion/Chromium);
- `npm install` в `remotion/` и скачивает headless-браузер;
- генерит crontab из `deploy/crontab` с **правильным путём репозитория и PATH к node**;
- запускает cron.

Проверка / эксплуатация:
```bash
crontab -l                                  # активное расписание
tail -f logs/zavod_$(date +%F).log          # смотреть прогон
tools/scheduled_run.sh test text 1          # ручной тест слота (опубликует 1 текст-пост)
crontab -r                                  # снять расписание (пауза)
```

Расписание (МСК): **08:00** demo-видео · **12:30** текст (Threads+IG) · **17:50** creator-видео.
Менять время/формат/объём — правь `deploy/crontab` и переустанови (`bash deploy/install.sh`).

## Вариант B — n8n (если уже крутишь docker-compose)

n8n всегда запущен в контейнере — поставь в каждом из 3 расписаний ноду **Schedule Trigger**
с cron-выражениями `0 8 * * *`, `30 12 * * *`, `50 17 * * *` (таймзона `Europe/Moscow` уже
задана в `docker-compose.yml`), далее **Execute Command**:
```
/data/repo/tools/scheduled_run.sh noon text 1
```
(смонтируй репозиторий в контейнер n8n и поставь туда node + зависимости Remotion).

## Безопасность
Ключи — только в `.env` (он в `.gitignore`, в репозиторий не попадает). В коде ключей нет.

# Публикация через Postiz (self-host, $0)

Postiz — опенсорс-планировщик соцсетей. Хостишь сам → платишь только за сервер
(а он уже есть под n8n). Через его Public API завод публикует ролики на TikTok /
Instagram / YouTube / Threads и др.

## 🔴 Честная оговорка (важно)
Self-host = **$0 за сервис**, НО подключение площадок идёт через **твои OAuth-
приложения**. Значит:
- **YouTube** — Google OAuth-приложение (просто, для своего канала).
- **Instagram/Threads** — Meta-приложение; для постинга может потребоваться
  расширенный доступ/проверка (свой аккаунт можно как тестера в dev-режиме).
- **TikTok** — Content Posting API требует **аудита приложения** TikTok.

То есть денег Postiz не берёт, но **аппрувы площадок частично остаются** (это цена
бесплатности). Если хочется совсем без аппрувов — `upload-post` (free-tier) исользует
свои одобренные приложения. Прагматично: начни с **YouTube** (легко), TikTok/IG
подключай по мере аудита — или комбинируй с upload-post для TT/IG.

## 1. Поднять Postiz
```bash
cd postiz
# отредактируй домен/секреты в docker-compose.yml, поставь за HTTPS-reverse-proxy
docker compose up -d
```
Открой `https://postiz.твойдомен`, создай аккаунт.

## 2. Подключить соцаккаунты
В UI Postiz: добавь каналы (TikTok / Instagram / YouTube / Threads). Для каждого
нужны OAuth-creds провайдера в env Postiz (см. docs.postiz.com → Providers).

## 3. Получить ключи для завода
- **API key:** Settings → Developers → Public API → в `POSTIZ_API_KEY`.
- **Базовый URL:** `POSTIZ_URL = {NEXT_PUBLIC_BACKEND_URL}/public/v1`
  (напр. `https://postiz.твойдомен/api/public/v1`).
- **ID каналов:**
  ```bash
  POSTIZ_URL=... POSTIZ_API_KEY=... node tools/postiz_channels.mjs
  # выведет id:type → впиши в POSTIZ_CHANNELS="id:tiktok,id:instagram,id:youtube"
  ```

## 4. Публикация
Скрипт (одиночно):
```bash
node tools/publish_postiz.mjs remotion/out/reel_run_0.mp4 "Текст поста" now
```
В пайплайне — **автоматически**: если в env заданы `POSTIZ_URL` + `POSTIZ_API_KEY`,
`tools/run_pipeline.sh` после рендера сам публикует каждый ролик:
```bash
ENSEMBLEDATA_TOKEN=... DEEPSEEK_API_KEY=... \
POSTIZ_URL=... POSTIZ_API_KEY=... POSTIZ_CHANNELS="..." \
tools/run_pipeline.sh 3
# тренд → бриф → сценарий → рендер → ПУБЛИКАЦИЯ — одной командой
```

## API (для справки / для WF5)
- `POST {POSTIZ_URL}/upload` (multipart `file`) → `{id, path}`
- `POST {POSTIZ_URL}/posts` body: `{type:"now", posts:[{integration:{id}, value:[{content, image:[{id,path}]}], settings:{__type:"tiktok"}}]}`
- `GET {POSTIZ_URL}/integrations` → список каналов
- Хедер: `Authorization: <api-key>`. Лимит: 90 постов/час, запрос ≤ 50 МБ.

n8n-воркфлоу WF5 можно навести на эти же эндпоинты (upload → posts) вместо upload-post.

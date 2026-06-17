# Чек-лист доступов и ключей

Это «последняя миля», которую можно сделать только руками. Без неё завод не поедет.
Хорошая новость: выбор агрегатора публикации **убрал Meta App Review** — раньше это
был самый долгий пункт (~2 недели).

## ✅ Обязательные (для MVP-публикации)

### 1. upload-post (агрегатор публикации)
- Регистрация: https://www.upload-post.com
- Подключить аккаунты: **YouTube**, **Instagram** (Business/Creator), **Threads**
- Взять API key → `UPLOAD_POST_API_KEY`, имя профиля → `UPLOAD_POST_PROFILE`
- Альтернатива: Blotato (больше готовых n8n-шаблонов, но дороже и кап на аккаунты)

### 2. Google Sheets (панель)
- Создать таблицу по схеме `03-google-sheets.md`, ID → `GOOGLE_SHEET_ID`
- Credential в n8n: Google Sheets OAuth2 (быстро) или Service Account
  (надёжнее для сервера — не протухает). Дать доступ к таблице.

### 3. Anthropic (LLM)
- https://console.anthropic.com → API key → `ANTHROPIC_API_KEY`
- Модели уже заданы в `.env`: `claude-sonnet-4-6` (сценарии), `claude-haiku-4-5` (тексты)

### 4. Telegram (дайджест + kill-switch)
- @BotFather → новый бот → token → `TELEGRAM_BOT_TOKEN`
- Свой chat_id (через @userinfobot) → `TELEGRAM_CHAT_ID`

## 🟡 Для Фазы 2 (AI-генерация видео)

### 5. fal.ai (генерация клипов)
- https://fal.ai → API key → `FAL_KEY`
- Модель в `FAL_VIDEO_MODEL`. Варианты:
  - `fal-ai/kling-video/v2/master/text-to-video` — Kling, баланс цена/качество
  - Veo-модели — премиум-качество, дороже
  - ⚠️ Sora — осторожно: вотермарка мешает перезаливке
- Replicate — альтернатива (тот же принцип async-job).

### 6. Creatomate (монтаж/сборка)
- https://creatomate.com → API key → `CREATOMATE_API_KEY`
- Собрать вертикальный шаблон 1080×1920 (фон-видео слот, субтитры, аутро-CTA) →
  `CREATOMATE_TEMPLATE_ID`
- TTS-озвучку можно делать внутри Creatomate-шаблона или отдельной нодой (ElevenLabs/OpenAI).

## 💸 Cost guard
`DAILY_VIDEO_BUDGET_USD` ограничивает траты WF3 на генерацию в день.
Начни с маленького значения (5–20). AI-видео — главный драйвер бюджета.

## Сводная таблица env

| env                   | сервис        | фаза | обязателен |
|-----------------------|---------------|------|------------|
| `ANTHROPIC_API_KEY`   | Anthropic     | 1    | да |
| `UPLOAD_POST_API_KEY` | upload-post   | 1    | да |
| `GOOGLE_SHEET_ID`     | Google Sheets | 1    | да |
| `TELEGRAM_BOT_TOKEN`  | Telegram      | 1/3  | да |
| `FAL_KEY`             | fal.ai        | 2    | для генерации |
| `CREATOMATE_API_KEY`  | Creatomate    | 2    | для генерации |

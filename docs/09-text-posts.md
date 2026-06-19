# Текстовые посты: Threads (провокация) + Instagram (карточка)

Отдельный трек завода — текст, по **аналитике залетающих Threads-постов**. Threads — короткий
провокационный пост (ловит лайки/ответы), Instagram — та же мысль карточкой-картинкой + подпись.

## Конвейер

```
mine_threads ──► gen_text_posts ──► publish_text
(аналитика     (паттерны+продукт   (Threads: чистый текст;
 Threads:       → N коротких        Instagram: карточка TextCard
 лайки/ответы/  провокационных      + подпись)
 репосты/час)   постов, RU)
```

| Шаг | Чем | Файл |
|-----|-----|------|
| Аналитика Threads | EnsembleData `/threads/keyword/search`, ранг по вовлечённости/час | `tools/mine_threads.mjs` → `mining/threads_winners.json` |
| Генерация | LLM (DeepSeek) по паттернам + продукт | `tools/gen_text_posts.mjs` → `mining/text_posts.json` |
| Карточка для IG | Remotion still | композиция `TextCard` (1080×1350) |
| Публикация | Blotato | `tools/publish_text.mjs` |

## Запуск

```bash
# весь текстовый трек (аналитика → генерация → публикация N постов)
BLOTATO_API_KEY=... BLOTATO_ACCOUNTS="threads:ID,instagram:ID" \
ENSEMBLEDATA_TOKEN=... DEEPSEEK_API_KEY=... \
tools/run_text_pipeline.sh 1

# или по шагам:
node tools/mine_threads.mjs              # mining/threads_winners.json
node tools/gen_text_posts.mjs 3          # mining/text_posts.json (3 поста)
node tools/publish_text.mjs 0            # опубликовать пост №0 в Threads + Instagram
```

## Что именно генерится

`mining/text_posts.json` — массив `{ threads, ig_card, ig_caption }`:
- **`threads`** — 1-2 строки, ≤~150 симв., провокационная/релейтбл мысль про боль «что готовить /
  однообразие / лишние траты / выкинутая еда», крючок-вопрос на ответ + ссылка `t.me/foodgenius_ai_bot`.
- **`ig_card`** — крупная фраза-крючок для картинки (рендерится композицией `TextCard`).
- **`ig_caption`** — подпись для Instagram: крючок + что делает бот + призыв + ссылка + ≤5 хэштегов.

## Нюансы платформ (Blotato)

- **Threads**: чистый текст, но в `content` обязателен `mediaUrls` — для текста передаём **пустой массив** `[]`.
- **Instagram**: «чистого текста» нет — постим **карточку-картинку** (`TextCard`) + подпись; хэштегов **максимум 5**.
- Threads-аналитика EnsembleData имеет **дневной лимит** запросов. Если он исчерпан — `mine_threads`
  не затирает кэш, генерация идёт по последнему удачному `threads_winners.json`.

## Аналитика → стиль

`mine_threads` ранжирует по вовлечённости/час (`лайки + репосты·2 + цитаты·2 + ответы·1.5`) и
сохраняет короткие выжимки + замеченный паттерн. Генератор использует их как референс стиля
(не копирует), а пишет наши провокационные посты под продукт. Залетевшие паттерны (примеры):
провокационный вопрос-челлендж, история-боль → простое решение, save-bait с цифрой-выгодой, сериал «День N».

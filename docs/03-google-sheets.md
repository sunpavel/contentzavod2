# Схема Google Sheets (панель / очередь)

Создай таблицу, первую вкладку назови **`queue`** (или поменяй `GOOGLE_SHEET_TAB`).
Первая строка — заголовки ровно в этом порядке (см. `sheets/content-queue-template.csv`,
его можно импортнуть в Sheets как есть).

## Колонки

| Колонка          | Кто пишет | Описание |
|------------------|-----------|----------|
| `id`             | WF1/руки  | уникальный id строки (можно автонумерация/uuid) |
| `status`         | автомат   | winner / idea / scripted / producing / produced / queued / published / error / skipped |
| `source_type`    | руки/WF1  | `clone` (реверс вирусного), `generate` (с нуля) или `upload` (готовый MP4) |
| `priority`       | руки      | 1–5, влияет на порядок разбора очереди |
| `trend_score`    | WF1/WF6   | оценка потенциала темы (0–100) |
| `format_id`      | WF1/WF2   | id формата из channel-dna (what_to_cook, week_plan_demo …) |
| `topic`          | WF1/руки  | короткая тема |
| `idea`           | WF1/руки  | развёрнутая идея/угол подачи |
| `hook`           | WF2       | хук (первые 1–3 сек) |
| `script`         | WF2       | сценарий / войсовер-текст |
| `shotlist_json`  | WF2       | JSON-массив сцен (промпты для генерации) |
| `beat_sheet_json`| WF2       | разбор структуры оригинала (хук/хроно/зачем) |
| `hook_type`      | WF2       | тип хука победителя (pov, shock_number, …) |
| `src_url`        | WF1       | ссылка на вирусный ролик-источник |
| `src_platform`   | WF1       | tiktok / instagram |
| `src_views`      | WF1       | просмотры источника |
| `src_likes`      | WF1       | лайки источника |
| `src_velocity`   | WF1       | лайки/день (скорость разгона) |
| `src_caption`    | WF1       | подпись источника |
| `relevance_score`| WF1       | оценка релевантности нише (0–100) |
| `video_url`      | WF3/руки  | публичный URL готового MP4 |
| `thumb_url`      | WF3       | обложка (опц.) |
| `yt_title`       | WF4       | заголовок YouTube |
| `yt_desc`        | WF4       | описание YouTube |
| `yt_tags`        | WF4       | теги YouTube (через запятую) |
| `ig_caption`     | WF4       | подпись Instagram (+хэштеги) |
| `threads_text`   | WF4       | текст Threads |
| `platforms`      | руки/WF4  | куда публиковать, напр. `youtube,instagram,threads` |
| `publish_at`     | WF4/руки  | ISO-время публикации |
| `upload_post_ids`| WF5       | id задач/постов в агрегаторе |
| `yt_link`        | WF5       | ссылка на опубликованный ролик |
| `ig_link`        | WF5       | ссылка |
| `threads_link`   | WF5       | ссылка |
| `views`          | WF6       | просмотры (сумма/по площадкам) |
| `likes`          | WF6       | лайки |
| `perf_score`     | WF6       | итоговая оценка успешности (для обучения трендов) |
| `cost_usd`       | WF3       | сколько стоила генерация ролика |
| `error_log`      | автомат   | текст ошибки при сбое |
| `created_at`     | WF1/руки  | когда создана строка |
| `published_at`   | WF5       | когда опубликовано |
| `notes`          | руки      | заметки |

## Как добавить готовый ролик (ветка upload)
Новая строка:
- `status = produced`
- `source_type = upload`
- `video_url = <публичный https на MP4>`
- `topic` / `idea` — пара слов, чтобы LLM понял о чём ролик
- `platforms = youtube,instagram,threads`

Дальше WF4 сам сочинит тексты и переведёт в `queued`.

## Вторая вкладка `cost_log` (опц.)
Для cost guard: WF3 пишет сюда `date, video_id, cost_usd`. WF3 суммирует расходы
за сегодня и сравнивает с `DAILY_VIDEO_BUDGET_USD`.

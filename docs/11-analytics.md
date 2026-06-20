# Петля аналитики: отдача → веса → ротация

Завод сам смещает выпуск к тому, что заходит — по нишам и площадкам.

```
публикация ──► post_log ──► fetch_metrics ──► post_metrics ──► update_weights ──► weights.json ──► next_target
(run_target)   (лог поста)   (просмотры YT)    (замеры)         (веса ниш/площ.)   (взвешенная ротация)
```

| Шаг | Файл |
|---|---|
| Лог постов | `run_target` → `mining/post_log.json` (ts, niche, platform, hook) |
| Сбор метрик | `tools/fetch_metrics.mjs` → `mining/post_metrics.json` |
| Веса | `tools/update_weights.mjs` → `config/weights.json` |
| Взвешенная ротация | `tools/next_target.mjs` (читает weights.json) |

## Как считаются веса
`score = просмотры + лайки·20`. Средний score по нише и по площадке делим на общий средний →
вес в диапазоне **0.4…2.0**. Вес пары = `niche_w × platform_w`, с **полом 0.25** (исследование —
слабые пары всё равно иногда выходят, чтобы не схлопнуться и ловить смену трендов).

## Автоматизм
Раз в день (утренний слот) `scheduled_run` сам гоняет `fetch_metrics → update_weights`.
Пока данных <3 — веса не пишутся, работает round-robin. По мере накопления постов ротация
смещается к победителям.

## Что нужно для авто-сбора YouTube-метрик
В `.env`: `YOUTUBE_API_KEY` (или `YOUTUBE_ACCESS_TOKEN`) + `YOUTUBE_CHANNEL_ID` (id нашего канала —
публичные данные). IG/Threads-инсайты — следующий шаг (нужен Graph API), пока можно дополнять
`mining/post_metrics.json` вручную из любой аналитики.

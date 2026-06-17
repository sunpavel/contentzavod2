# Remotion как рендер-движок завода ($0-путь)

Помимо дорогой AI-генерации (WF3: fal.ai + Creatomate) у завода есть **дешёвый
шаблонный путь** — программный рендер рилсов на Remotion. Идеален для
product-demo контента: хук-боль → реальные кадры приложения → CTA.

## Что это
- Композиция `DemoReel` (см. `remotion/src/DemoReel.tsx`) собирает рилс из:
  хук (приходит **пропсом** `hook`) → онбординг → реальная запись плана → бит
  ценности → CTA.
- Хук-варианты — это просто JSON в `remotion/props/*.json`. Меняешь хук — новый
  ролик. Один движок, бесконечно вариантов.

## Команды
```bash
cd remotion
npm run render:batch                 # рендерит все props/*.json → out/reel_<name>.mp4
npm run render:one props/x.json out/x.mp4   # один ролик
```

`render_batch.mjs` пропускает файлы НЕ с расширением `.json` — поэтому
«паузить» вариант можно переименованием `delivery.json → delivery.json.off`
(так отключается проигравший по аналитике хук).

## Подключение к n8n (WF3-template)
Завод вызывает рендер через **Execute Command** на хосте n8n.

Нода `Execute Command`:
```
bash /data/contentzavod2/tools/factory_render.sh "{{ $json.id }}" '{{ $json.hook_json }}'
```
- вход: строка очереди со `status=scripted`, `source_type=template`, где `hook_json`
  — массив карточек хука (его готовит WF2/LLM или берётся шаблон);
- выход: `stdout` = путь к MP4 → пишем в `video_url`, ставим `status=produced`;
- дальше ролик идёт обычным путём WF4 (тексты) → WF5 (публикация).

Готовый воркфлоу: `workflows/wf3b-remotion-render.json`.

### ⚠️ Требования к окружению n8n
Execute Command исполняется в контейнере n8n, поэтому там должны быть:
- Node 18+ и установленный `remotion/` (с `node_modules`),
- headless-Chrome (Remotion ставит сам: `npx remotion browser ensure`),
- смонтированный репозиторий (volume) с `remotion/` и `tools/`.

Если не хочешь тащить это в контейнер n8n — вынеси рендер в отдельный сервис
(маленький HTTP-эндпоинт вокруг `render_one.mjs`) и дёргай его HTTP-нодой.

## Петля обучения (как у нас сейчас)
Сигнал «1 и 3 зашли, 2 нет» → усиливаем победителей (больше хуков в их боли),
проигравший паузим (`*.json.off`). Это ровно то, что делает WF6 автоматически:
`perf_score` по архетипу → веса в WF1.

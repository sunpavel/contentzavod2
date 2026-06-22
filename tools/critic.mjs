// Критик контента (OpenAI): текст-рубрика (скрипт vs ДНК топ-ролика) + vision по кадрам рендера.
// Возвращает {score 0-10, issues[], revised?}. Без ключа — мягко пропускает (score 8).
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { hookRule, getPlatform } from "./audience.mjs";

const critRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
// Реальные залетевшие заголовки YouTube (просмотры) из solarn8n — грунт для критика хука.
const ytRefsText = () => {
  try {
    const p = join(critRoot, "mining", "youtube_refs.json");
    if (!existsSync(p)) return "";
    const refs = JSON.parse(readFileSync(p, "utf8")).slice(0, 8);
    if (!refs.length) return "";
    return "\n\nРЕАЛЬНЫЕ ЗАЛЕТЕВШИЕ РОЛИКИ (YouTube, по просмотрам) — эталон хука:\n" +
      refs.map((r) => `- «${r.title}» — ${Number(r.views || 0).toLocaleString("ru-RU")} просмотров`).join("\n");
  } catch { return ""; }
};

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";        // текст-критик (дёшево)
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o"; // vision-критик (точнее читает кадр)

async function chat(messages, maxTokens = 900, model = MODEL) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.4, response_format: { type: "json_object" }, messages }),
  });
  const j = await r.json();
  if (j.error) throw new Error("OpenAI: " + JSON.stringify(j.error).slice(0, 200));
  return j.choices?.[0]?.message?.content || "{}";
}

const RUBRIC = `Рубрика топового короткого вертикального видео (UGC, ниша еда/питание) ДЛЯ ПРОДУКТА FoodGenius:
- ХУК: первые ~1.5 сек цепляют (разрыв шаблона / острая боль / смелое заявление / вопрос). Без раскачки.
- ДЛИНА: сжато, ~12-18 сек, ≤45 слов в озвучке, без воды.
- ПРОДУКТ (ОБЯЗАТЕЛЬНО): в тексте ясно есть FoodGenius — AI собирает план питания на неделю + список покупок в Telegram —
  и CTA ведёт в бота. Тренд из брифа даёт ТОЛЬКО хук/структуру/энергию; НЕЛЬЗЯ превращать ролик в обычный рецепт без продукта.
- ОДИН чёткий месседж + понятный CTA.
- Разговорный живой тон, не реклама-в-лоб, без клише и обмана.`;

export async function scoreScript(brief, spec) {
  if (!KEY) return { score: 8, issues: [], revised: null, _skip: "нет OPENAI_API_KEY" };
  const sys =
    `Ты — жёсткий креативный критик коротких видео бренда FoodGenius. Адаптируй ЭНЕРГИЮ/ХУК/СТРУКТУРУ тренда под наш продукт, ` +
    `а не копируй чужой рецепт. Верни СТРОГО JSON: {"score": 0-10, "issues": ["конкретная правка", ...], "revised": <та же спека, ТЕ ЖЕ поля, улучшенная>}. ` +
    `ЖЁСТКО: в revised ОБЯЗАТЕЛЬНО сохрани продукт FoodGenius (план питания + список покупок, бот в Telegram) и CTA в бота — ` +
    `если правка убирает продукт, это ПЛОХО (низкий score). Если уже сильно (8+): issues=[], revised=null. Кириллица. ${RUBRIC}`;
  let platRule = "";
  try { if (spec.platform) platRule = `\nПЛОЩАДКА ${getPlatform(spec.platform).name}: хук должен соответствовать правилу — ${hookRule(spec.platform)}`; } catch {}
  const user = `БРИФ (ДНК топ-ролика — берём только хук/структуру):\n${brief}${ytRefsText()}${platRule}\n\nСЦЕНАРИЙ (спека):\n${JSON.stringify(spec)}\n\nСравни силу хука с реальными залетевшими и с правилом площадки. Оцени; при правке сохрани поля спеки И продукт.`;
  return JSON.parse(await chat([{ role: "system", content: sys }, { role: "user", content: user }]));
}

// Рубрика ВИРАЛЬНОЙ ветки Threads (что алгоритм разгоняет в первый час).
const THREAD_RUBRIC = `Рубрика виральной ветки в Threads (алгоритм гонит то, что в первый час лайкают/комментят/сохраняют):
- ХУК (1-й твит): чистая БОЛЬ или разрыв шаблона ЦА, ≤12 слов, без раскачки — листать невозможно.
- СОХРАНЕНИЕ: уже 2-й твит даёт явный сигнал ценности / команду сохранить ("сохрани, чтобы не потерять" + что внутри).
- АВТОНОМНОСТЬ: каждый твит самостоятелен — вырви любой, он несёт законченную мысль/ценность (репостят отдельно).
- КОНКРЕТИКА: цифры, шаги, примеры; без воды и общих фраз.
- ГДЕ ТЕРЯЕТСЯ ЖЕЛАНИЕ РЕАГИРОВАТЬ: найди твит, где падает энергия/появляется вода — это убивает разгон, его надо переписать.
- ФИНАЛ: вопрос, который НЕВОЗМОЖНО проигнорировать — острый/личный выбор, провоцирует ответы (комменты = топливо алгоритма). Не вялое "а как у вас?".
- ПРОДУКТ (ОБЯЗАТЕЛЬНО): FoodGenius (AI-план питания + список покупок, бот в Telegram) присутствует естественно, НЕ реклама-в-лоб.`;

// Оценка ветки Threads: возвращает {score 0-10, issues[], revised:{hook, posts[]}}. Без ключа — мягко пропускает.
export async function scoreThread(brief, thread) {
  if (!KEY) return { score: 8, issues: [], revised: null, _skip: "нет OPENAI_API_KEY" };
  const sys =
    `Ты — жёсткий редактор виральных веток в Threads для бренда FoodGenius. Оцени ветку и при необходимости перепиши хук и финал и убери провисания. ` +
    `Верни СТРОГО JSON: {"score":0-10,"issues":["конкретная правка", ...],"revised":{"hook":"...","posts":["твит 1","..."]}}. ` +
    `ЖЁСТКО: в revised сохрани продукт FoodGenius (план питания + список покупок, бот в Telegram) и структуру (хук-боль → сохранение → автономные твиты → финал-вопрос). ` +
    `Ссылку на бота в твиты НЕ вставляй (её добавят отдельным постом). Если уже сильно (8+): issues=[], revised=null. Кириллица. ${THREAD_RUBRIC}`;
  const user = `НИША/ПЛОЩАДКА (бриф):\n${brief}${ytRefsText()}\n\nВЕТКА (JSON):\n${JSON.stringify(thread)}\n\nНайди, где читатель теряет желание реагировать; сравни силу хука с залетевшими; усиль финал-вопрос. Оцени; при правке сохрани структуру И продукт.`;
  return JSON.parse(await chat([{ role: "system", content: sys }, { role: "user", content: user }], 1100));
}

// image_url-часть с правильным mime по расширению
const imgPart = (p) => ({ type: "image_url", image_url: { url: `data:${p.endsWith(".png") ? "image/png" : "image/jpeg"};base64,${readFileSync(p).toString("base64")}`, detail: "high" } });

export async function scoreFrames(brief, imagePaths, context = "") {
  if (!KEY) return { score: 8, issues: [], _skip: "нет OPENAI_API_KEY" };
  const imgs = imagePaths.map(imgPart);
  const sys =
    `Ты — визуальный критик. Это UGC-ролик «реальный человек за столом рассказывает + вставка приложения + CTA» для продукта FoodGenius. ` +
    `Оцени ИМЕННО ЭТОТ формат по лучшим практикам коротких видео. Бриф тренда — лишь ИСТОЧНИК ХУКА/УГЛА, ` +
    `НЕ требуй, чтобы это был рецепт-монтаж/таймлапс/без ведущего — у нас осознанно говорящая голова. ` +
    `Верни СТРОГО JSON: {"score":0-10,"issues":["конкретная ВЫПОЛНИМАЯ правка кадра/текста", ...]}. ` +
    `Смотри: есть ли КРУПНЫЙ текст-хук в первом кадре (для просмотра без звука), читаемость подписей, ` +
    `композиция (человек и вставка приложения не перекрывают лишнее), заметность и ясность CTA со ссылкой. ` +
    `Не предлагай добавлять процесс готовки/ингредиенты — это другой формат.`;
  const user = [{ type: "text", text: `Угол/хук из брифа:\n${brief}\n${context}\nКадры по порядку (начало → CTA):` }, ...imgs];
  return JSON.parse(await chat([{ role: "system", content: sys }, { role: "user", content: user }], 700, VISION_MODEL));
}

// Сравнение НАШИХ кадров с кадрами РЕАЛЬНЫХ залетевших роликов (эталон с просмотрами).
export async function compareToTop(brief, ourImagePaths, refImagePaths) {
  if (!KEY) return { score: 8, issues: [], _skip: "нет OPENAI_API_KEY" };
  if (!refImagePaths || !refImagePaths.length) return scoreFrames(brief, ourImagePaths); // нет эталонов — обычная оценка
  const sys =
    `Ты — визуальный критик. Сравни НАШ ролик с РЕАЛЬНЫМИ залетевшими роликами той же ниши (у них много просмотров). ` +
    `Наш осознанный формат: реальный человек + вставка приложения + CTA (продукт FoodGenius). От залетевших бери НЕ копию, ` +
    `а то, что цепляет: хук в кадре, темп, читаемость, эмоция, упаковка. Верни СТРОГО JSON: ` +
    `{"score":0-10,"issues":["конкретная правка, чтобы приблизиться к уровню залетевших", ...]}. ` +
    `Не требуй менять наш формат на чужой — оценивай притягательность и упаковку.`;
  const user = [
    { type: "text", text: `Ниша/угол:\n${brief}\n\nКАДРЫ ЗАЛЕТЕВШИХ РОЛИКОВ (эталон, много просмотров):` },
    ...refImagePaths.map(imgPart),
    { type: "text", text: `КАДРЫ НАШЕГО РОЛИКА (начало → CTA):` },
    ...ourImagePaths.map(imgPart),
  ];
  return JSON.parse(await chat([{ role: "system", content: sys }, { role: "user", content: user }], 700, VISION_MODEL));
}

// CLI: node tools/critic.mjs script  <brief.json> <spec.json>
//      node tools/critic.mjs frames  <brief.json> <img1> [img2 ...]
//      node tools/critic.mjs compare <brief.json> <our1,our2,...> <ref1,ref2,...>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , mode, briefPath, ...rest] = process.argv;
  const brief = readFileSync(briefPath, "utf8");
  if (mode === "script") console.log(JSON.stringify(await scoreScript(brief, JSON.parse(readFileSync(rest[0], "utf8"))), null, 2));
  else if (mode === "frames") console.log(JSON.stringify(await scoreFrames(brief, rest), null, 2));
  else if (mode === "compare") console.log(JSON.stringify(await compareToTop(brief, rest[0].split(","), (rest[1] || "").split(",").filter(Boolean)), null, 2));
  else console.error("usage: critic.mjs script|frames|compare <brief.json> ...");
}

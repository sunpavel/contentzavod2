// Критик контента (OpenAI): текст-рубрика (скрипт vs ДНК топ-ролика) + vision по кадрам рендера.
// Возвращает {score 0-10, issues[], revised?}. Без ключа — мягко пропускает (score 8).
import { readFileSync } from "node:fs";

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
  const user = `БРИФ (ДНК топ-ролика — берём только хук/структуру):\n${brief}\n\nСЦЕНАРИЙ (спека):\n${JSON.stringify(spec)}\n\nОцени; при правке сохрани поля спеки И продукт.`;
  return JSON.parse(await chat([{ role: "system", content: sys }, { role: "user", content: user }]));
}

export async function scoreFrames(brief, imagePaths, context = "") {
  if (!KEY) return { score: 8, issues: [], _skip: "нет OPENAI_API_KEY" };
  const imgs = imagePaths.map((p) => ({ type: "image_url", image_url: { url: `data:image/png;base64,${readFileSync(p).toString("base64")}`, detail: "high" } }));
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

// CLI: node tools/critic.mjs script <brief.json> <spec.json>
//      node tools/critic.mjs frames <brief.json> <img1.png> [img2.png ...]
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , mode, briefPath, ...rest] = process.argv;
  const brief = readFileSync(briefPath, "utf8");
  if (mode === "script") console.log(JSON.stringify(await scoreScript(brief, JSON.parse(readFileSync(rest[0], "utf8"))), null, 2));
  else if (mode === "frames") console.log(JSON.stringify(await scoreFrames(brief, rest), null, 2));
  else console.error("usage: critic.mjs script|frames <brief.json> ...");
}

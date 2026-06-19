// Внутренний ИИ-сценарист: БРИФ (по трендовому видео) → N адаптированных ReelSpec → props/gen_*.json
// Запуск:  node scriptwriter.mjs <brief.json> [N]
// Требует ANTHROPIC_API_KEY (+опц. LLM_MODEL_SMART). Дальше: npm run render:batch
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chat } from "../tools/llm.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const [, , briefPath, nArg, fmtArg] = process.argv;
const N = Number(nArg || 3);
const FORMAT = (fmtArg || process.env.FORMAT || "demo").toLowerCase(); // demo | creator
if (!briefPath) {
  console.error("usage: node scriptwriter.mjs <brief.json> [N] [demo|creator]");
  process.exit(1);
}
const brief = readFileSync(briefPath, "utf8");
const DEEPSEEK = process.env.DEEPSEEK_API_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
if (!DEEPSEEK && !ANTHROPIC) {
  console.error("нет DEEPSEEK_API_KEY или ANTHROPIC_API_KEY в окружении");
  process.exit(1);
}

const SCHEMA_DEMO = `ReelSpec = {
  hook: [{label, line, size}, {label, line, size}],
     // label — короткий КОНТЕКСТ-тег 1-3 слова («Каждый вечер», «В холодильнике»), НЕ "Карточка N"
     // line — короткая ударная фраза (1-я ≤18 символов, 2-я ≤26), size ~150 и ~110
  capOnboarding: string,   // подпись над онбордингом (короткая)
  capMenu: string,         // подпись над меню/планом
  benefit: [string, string, string],  // 3 коротких строки выгоды; последняя — акцентная
  ctaTitle: string,        // ТОЛЬКО призыв в 2 строки через \\n; БЕЗ @-хэндла
  accent: string           // hex: зелёный #34D399 / янтарь #F4A623 / роза #E23B30
}`;

const SCHEMA_CREATOR = `CreatorSpec = {
  hookLine: string,    // первая фраза «в камеру», от первого лица, разговорно, 2 строки через \\n
                       //   («Я перестала думать,\\nчто готовить»), ≤6 слов в строке
  beats: [string, string, string],
     // РОВНО 3 реплики «закадрового рассказа». Каждая — живая разговорная фраза 8-16 слов.
     // Важно: они идут поверх трёх экранов приложения СТРОГО в порядке:
     //   beats[0] — экран онбординга/настройки («как это работает», задаёшь цель/продукты)
     //   beats[1] — экран меню на неделю («каждый день новое блюдо, разнообразие, калории»)
     //   beats[2] — экран плана/списка покупок («готовый список, иду в магазин»)
     // Пиши их так, чтобы подходили к этим экранам.
  ctaTitle: string,    // призыв в 2 строки через \\n; БЕЗ @-хэндла
  accent: string       // hex: бирюза #14C7C0 / зелёный #34D399 / янтарь #F4A623
}`;

const sysDemo =
  `Каждый ролик — это ReelSpec по схеме: ${SCHEMA_DEMO} ` +
  `Формат — динамичный продуктовый промо-ролик (боль → решение → демо → выгоды → CTA).`;

const sysCreator =
  `Каждый ролик — это CreatorSpec по схеме: ${SCHEMA_CREATOR} ` +
  `Формат — UGC «блогер/ИИ-персонаж рассказывает в камеру», на экране показывается web app. ` +
  `Тон — живой, личный, разговорный, от первого лица (как будто реальный человек делится опытом), ` +
  `БЕЗ рекламного пафоса и без слова «реклама». Без преувеличений и кликбейта-обмана.`;

const system =
  `Ты — внутренний креативный сценарист контент-завода FoodGenius ` +
  `(AI-план питания + список покупок в Telegram; бот @foodgenius_ai_bot + web app). ` +
  `Тебе дают БРИФ, собранный из трендового ролика: его тип, стиль, сценарий, месседж, хук, структуру. ` +
  `Сделай ${N} РАЗНЫХ роликов по той же проверенной формуле/типу/стилю, но адаптированных под наш продукт ` +
  `и боли (однообразие еды, лишние траты, выкинутые продукты, «что готовить»). ` +
  `Между вариантами меняй угол/месседж/реплики/CTA/акцент. ` +
  (FORMAT === "creator" ? sysCreator : sysDemo) +
  ` ЖЁСТКИЕ ПРАВИЛА: без эмодзи и значков (✅🔥 и т.п. — шрифт их не рисует); ` +
  `ctaTitle БЕЗ @foodgenius_ai_bot (хэндл добавляется автоматически). ` +
  `Верни СТРОГО JSON-массив из ${N} ${FORMAT === "creator" ? "CreatorSpec" : "ReelSpec"}. Кириллица. Без медицинских обещаний.`;

const userMsg = `БРИФ (из трендового видео):\n${brief}\n\nВерни массив из ${N} ${FORMAT === "creator" ? "CreatorSpec" : "ReelSpec"}.`;

let txt = "[]";
try {
  txt = (await chat(system, userMsg, 2500)) || "[]";
} catch (e) {
  console.error(String(e));
  process.exit(1);
}
const m = txt.match(/\[[\s\S]*\]/);
if (m) txt = m[0];
let specs = [];
try {
  specs = JSON.parse(txt);
} catch (e) {
  console.error("не распарсил ответ модели:", txt.slice(0, 300));
  process.exit(1);
}
// Санитайзер: режем эмодзи/значки и @-хэндл (на случай если модель проскочила)
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}]/gu;
const clean = (s) =>
  typeof s === "string"
    ? s.replace(EMOJI, "").replace(/@foodgenius\S*/gi, "").replace(/[ \t]{2,}/g, " ").replace(/ *\n */g, "\n").trim()
    : s;
const deep = (o) =>
  Array.isArray(o) ? o.map(deep) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deep(v)])) : clean(o);

// Для creator-формата: beats[] (3 строки) → [{say, clip}] с фиксированным порядком экранов.
const CLIPS = ["onboarding", "menu", "plan"];
const toCreator = (s) => {
  const raw = Array.isArray(s.beats) ? s.beats : [];
  const beats = [0, 1, 2].map((i) => ({ say: clean(typeof raw[i] === "string" ? raw[i] : raw[i]?.say || ""), clip: CLIPS[i] }));
  return { hookLine: clean(s.hookLine || ""), beats, ctaTitle: clean(s.ctaTitle || ""), accent: clean(s.accent || "#14C7C0") };
};

// Свежий прогон пишем в чистую папку run/ (ephemeral) — её рендерит пайплайн.
const outDir = join(root, "run");
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (f.endsWith(".json")) rmSync(join(outDir, f));
specs.forEach((s, i) => {
  const out = FORMAT === "creator" ? toCreator(s) : deep(s);
  const p = join(outDir, `spec_${i}.json`);
  writeFileSync(p, JSON.stringify(out, null, 2));
  console.log("✓", p);
});
console.log(`\nГотово: ${specs.length} спек (${FORMAT}) → run/. Дальше: рендер run/*.json`);

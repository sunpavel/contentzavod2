// Внутренний ИИ-сценарист: БРИФ (по трендовому видео) → N адаптированных ReelSpec → props/gen_*.json
// Запуск:  node scriptwriter.mjs <brief.json> [N]
// Требует ANTHROPIC_API_KEY (+опц. LLM_MODEL_SMART). Дальше: npm run render:batch
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const [, , briefPath, nArg] = process.argv;
const N = Number(nArg || 3);
if (!briefPath) {
  console.error("usage: node scriptwriter.mjs <brief.json> [N]");
  process.exit(1);
}
const brief = readFileSync(briefPath, "utf8");
const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error("нет ANTHROPIC_API_KEY в окружении");
  process.exit(1);
}
const model = process.env.LLM_MODEL_SMART || "claude-sonnet-4-6";

const SCHEMA = `ReelSpec = {
  hook: [{label, line, size}, {label, line, size}],
     // label — короткий КОНТЕКСТ-тег 1-3 слова («Каждый вечер», «В холодильнике»), НЕ "Карточка N"
     // line — короткая ударная фраза (1-я ≤18 символов, 2-я ≤26), size ~150 и ~110
  capOnboarding: string,   // подпись над онбордингом (короткая)
  capMenu: string,         // подпись над меню/планом
  benefit: [string, string, string],  // 3 коротких строки выгоды; последняя — акцентная
  ctaTitle: string,        // ТОЛЬКО призыв в 2 строки через \\n; БЕЗ @-хэндла
  accent: string           // hex: зелёный #34D399 / янтарь #F4A623 / роза #E23B30
}`;

const system =
  `Ты — внутренний креативный сценарист контент-завода FoodGenius ` +
  `(AI-план питания + список покупок в Telegram; бот @foodgenius_ai_bot + web app). ` +
  `Тебе дают БРИФ, собранный из трендового ролика: его тип, стиль, сценарий, месседж, хук, структуру. ` +
  `Сделай ${N} РАЗНЫХ роликов по той же проверенной формуле/типу/стилю, но адаптированных под наш продукт ` +
  `и боли (однообразие еды, лишние траты, выкинутые продукты, «что готовить»). ` +
  `Между вариантами меняй угол/месседж/подписи/CTA/акцент, сохраняя структуру тренда. ` +
  `Каждый ролик — это ReelSpec по схеме: ${SCHEMA} ` +
  `ЖЁСТКИЕ ПРАВИЛА: без эмодзи и значков (✅🔥 и т.п. — шрифт их не рисует); ` +
  `короткие ударные фразы; ctaTitle БЕЗ @foodgenius_ai_bot (хэндл добавляется автоматически). ` +
  `Верни СТРОГО JSON-массив из ${N} ReelSpec. Кириллица. Без медицинских обещаний.`;

const body = {
  model,
  max_tokens: 2500,
  system,
  messages: [{ role: "user", content: `БРИФ (из трендового видео):\n${brief}\n\nВерни массив из ${N} ReelSpec.` }],
};

const r = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
  body: JSON.stringify(body),
});
const j = await r.json();
let txt = j?.content?.[0]?.text || "[]";
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

mkdirSync(join(root, "props"), { recursive: true });
const stamp = Date.now();
specs.forEach((s, i) => {
  const p = join(root, "props", `gen_${stamp}_${i}.json`);
  writeFileSync(p, JSON.stringify(deep(s), null, 2));
  console.log("✓", p);
});
console.log(`\nГотово: ${specs.length} спек → props/. Дальше: npm run render:batch`);

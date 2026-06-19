// Подпись к посту из ReelSpec. Всегда содержит ссылку на бота.
// Использование (CLI):  node tools/build_caption.mjs <spec.json> [platform]
//   platform: youtube | instagram | tiktok | threads  (по умолчанию — универсальная)
// Можно и импортировать: import { buildCaption } from "./build_caption.mjs"
import { readFileSync } from "node:fs";

export const BOT_URL = "https://t.me/foodgenius_ai_bot";
export const BOT_HANDLE = "@foodgenius_ai_bot";

// Базовые хэштеги (рус. фуд-ниша) + общие. Платформа может добавить свои.
const BASE_TAGS = [
  "#рецепты", "#чтоприготовить", "#ужин", "#планпитания",
  "#mealprep", "#готовимдома", "#экономия", "#списокпокупок",
  "#здоровоепитание", "#нейросеть",
];
const PLATFORM_TAGS = {
  youtube: ["#shorts", "#ai"],
  instagram: ["#reels", "#рилс", "#еда"],
  tiktok: ["#фуд", "#лайфхак"],
  threads: [],
};

const oneLine = (s) => String(s || "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();

export function buildCaption(spec, platform = "") {
  const p = String(platform || "").toLowerCase();

  // 1) Хук — первая строка (она же уходит в заголовок YouTube)
  const hookLine = oneLine((spec.hook || []).map((h) => h.line).join(" ")) || "Что приготовить на этой неделе?";

  // 2) Месседж: коротко что делает продукт (можно опереться на benefit)
  const benefit = (spec.benefit || []).map(oneLine).filter(Boolean);
  const value =
    "AI соберёт персональный план питания на неделю и список покупок за 10 секунд." +
    (benefit.length ? " " + benefit.slice(0, 2).join(". ") + "." : "");

  // 3) CTA + ссылка на бота (всегда!). Не дублируем «бесплатно», если оно уже в CTA.
  const cta = oneLine(spec.ctaTitle) || "Попробуй";
  const free = /бесплатн/i.test(cta) ? "в Telegram" : "Бесплатно, в Telegram";
  const ctaBlock = `${cta} 👇 ${free}:\n${BOT_URL}`;

  // 4) Хэштеги
  const tags = [...BASE_TAGS, ...(PLATFORM_TAGS[p] || [])];

  return [hookLine, "", value, "", ctaBlock, "", tags.join(" ")].join("\n");
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , specPath, platform] = process.argv;
  if (!specPath) {
    console.error("usage: node tools/build_caption.mjs <spec.json> [platform]");
    process.exit(1);
  }
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  process.stdout.write(buildCaption(spec, platform));
}

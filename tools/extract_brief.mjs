// Авто-бриф: mining/winners.json → LLM → mining/brief.json
// Извлекает ОБЩИЙ паттерн победителей (тип/стиль/месседж/структура) для сценариста.
// Запуск: node tools/extract_brief.mjs   (нужен DEEPSEEK_API_KEY или ANTHROPIC_API_KEY)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chat } from "./llm.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const winners = JSON.parse(readFileSync(join(root, "mining", "winners.json"), "utf8"));
const top = winners
  .slice(0, 8)
  .map((w) => `- "${w.desc}" | ${w.plays} просм, ${w.vph} просм/час, eng ${w.eng}%`)
  .join("\n");

const system =
  "Ты разбираешь трендовые короткие фуд-видео и готовишь БРИФ для адаптации под продукт " +
  "FoodGenius (AI-план питания + список покупок в Telegram). Анализируй ОБЩИЙ паттерн/формулу " +
  "победителей, не копируй дословно.";

const user =
  `Топ трендовых фуд-роликов TikTok (по скорости просмотров):\n${top}\n\n` +
  `Выдели общий паттерн победителей и верни СТРОГО JSON-бриф:\n` +
  `{\n` +
  `  "type": "тип/формат",\n` +
  `  "style": "стиль подачи",\n` +
  `  "message": "ядро месседжа",\n` +
  `  "hook_type": "тип хука",\n` +
  `  "structure": [{"t":"0-3s","beat":"...","purpose":"..."}],\n` +
  `  "why_worked": "почему заходит",\n` +
  `  "adapt_angles": ["3-5 углов под FoodGenius (план/список/экономия/время/семья)"]\n` +
  `}\nТолько JSON.`;

let txt = await chat(system, user, 1500);
const m = txt.match(/\{[\s\S]*\}/);
if (m) txt = m[0];
let brief;
try {
  brief = JSON.parse(txt);
} catch (e) {
  console.error("не распарсил ответ модели:", txt.slice(0, 300));
  process.exit(1);
}
brief._source = "EnsembleData winners (" + winners.length + ")";
writeFileSync(join(root, "mining", "brief.json"), JSON.stringify(brief, null, 2));
console.log("✓ mining/brief.json");
console.log("  тип:", brief.type, "| месседж:", brief.message);
console.log("  углы:", (brief.adapt_angles || []).join(" · "));

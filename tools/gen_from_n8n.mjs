// Источник скрипта из solarn8n: вебхук foodgenius-gen (реальные тренды YouTube + Gemini-концепт)
// → короткий устный скрипт для нашего HeyGen-аватара. Реальные youtube_refs → критику.
// Запуск: node tools/gen_from_n8n.mjs            (вызовет вебхук)
//         node tools/gen_from_n8n.mjs --file /tmp/fg.json   (взять готовый ответ, без повторного вызова)
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chat } from "./llm.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK_URL = process.env.N8N_GEN_WEBHOOK || "https://solarn8n.su/webhook/foodgenius-gen";

let c;
const fileArg = process.argv.indexOf("--file");
if (fileArg !== -1) {
  c = JSON.parse(readFileSync(process.argv[fileArg + 1], "utf8"));
} else {
  const r = await fetch(HOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  c = await r.json().catch(() => ({}));
}
if (!c || !c.voiceover) { console.error("n8n не вернул концепт:", JSON.stringify(c).slice(0, 200)); process.exit(1); }

// сжать длинный voiceover в КОРОТКИЙ устный скрипт под 15-сек ролик (хук + продукт + CTA)
const sys =
  "Ты сжимаешь рекламный voiceover в КОРОТКИЙ устный скрипт для 15-секундного ролика с реальным человеком. " +
  "ЖЁСТКО: максимум 40 слов, начни с сильного хука, сохрани продукт FoodGenius (AI-план питания и список покупок в Telegram) и призыв. " +
  "Без эмодзи, без мата. Верни СТРОГО JSON {\"hook\":\"короткий хук-фраза\",\"script\":\"весь монолог ≤40 слов\",\"ctaTitle\":\"призыв 2 строки через \\n\"}.";
const user = `Хук-исходник: ${c.hook_text || ""}\nVoiceover: ${c.voiceover}\nCTA: ${c.caption || ""}`;
let out;
try { out = JSON.parse((await chat(sys, user, 500)).match(/\{[\s\S]*\}/)[0]); }
catch (e) { console.error("сжатие не удалось:", String(e).slice(0, 150)); process.exit(1); }

const spec = { hook: out.hook, script: out.script, ctaTitle: out.ctaTitle || "Попробуй\nбесплатно", accent: "#14C7C0" };
mkdirSync(join(root, "remotion", "run"), { recursive: true });
writeFileSync(join(root, "remotion", "run", "spec_0.json"), JSON.stringify(spec, null, 2));
mkdirSync(join(root, "mining"), { recursive: true });
writeFileSync(join(root, "mining", "youtube_refs.json"), JSON.stringify(c.youtube_refs || [], null, 2));
writeFileSync(join(root, "mining", "n8n_concept.json"), JSON.stringify(c, null, 2));

console.log("✓ из solarn8n (тренды YouTube → концепт):");
console.log("  trend_basis:", (c.trend_basis || "").slice(0, 100));
console.log("  hook:", spec.hook);
console.log("  script (" + spec.script.split(/\s+/).filter(Boolean).length + " слов):", spec.script);
console.log("✓ youtube_refs для критика:", (c.youtube_refs || []).length, "реальных залетевших");

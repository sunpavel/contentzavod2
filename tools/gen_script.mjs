// Единый генератор скрипта под (нишу × площадку): тон/хук отстраивается и от ниши, и от соцсети,
// с опорой на реальные залетевшие (youtube_refs из solarn8n). Пишет remotion/run/spec_0.json (avatar).
// Запуск: node tools/gen_script.mjs <niche> <platform>
//   niche: weight_loss|fitness|family|budget   platform: youtube|instagram|tiktok|threads
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chat } from "./llm.mjs";
import { systemBrief, accentFor, getNiche, getPlatform } from "./audience.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , nicheId = "family", platformId = "youtube"] = process.argv;

// реальные залетевшие заголовки (если есть) — как эталон силы хука
let refs = "";
const rp = join(root, "mining", "youtube_refs.json");
if (existsSync(rp)) {
  try {
    const arr = JSON.parse(readFileSync(rp, "utf8")).slice(0, 6);
    if (arr.length) refs = "\nРеальные залетевшие (YouTube, просмотры) — равняйся на силу хука:\n" +
      arr.map((r) => `- «${r.title}» (${Number(r.views || 0).toLocaleString("ru-RU")})`).join("\n");
  } catch {}
}

const isText = platformId === "threads" || getPlatform(platformId).length_sec?.[1] === 0;
const shape = isText
  ? `{"hook":"первая строка ≤10 слов","script":"ОЧЕНЬ короткий пост: 1-3 строки, ≤280 символов, провокационно/лично, крючок на ответ — БЕЗ абзацев","ctaTitle":"короткий призыв"}`
  : `{"hook":"экранный хук-фраза","script":"устный монолог под длину площадки, начни с хука, сохрани продукт и призыв","ctaTitle":"призыв 2 строки через \\n"}`;

const system =
  `Ты — креативный сценарист FoodGenius (AI-план питания + список покупок в Telegram, бот @foodgenius_ai_bot). ` +
  systemBrief(nicheId, platformId) +
  ` ${isText ? "Это ТЕКСТОВЫЙ пост." : "Это видео с реальным человеком (озвучка)."} ` +
  `Без эмодзи в тексте видео; без мата. Продукт и призыв обязательны. ` +
  `Верни СТРОГО JSON: ${shape}`;
const user = `Сделай ОДИН цепляющий вариант под нишу «${getNiche(nicheId).name}» и площадку ${getPlatform(platformId).name}.${refs}`;

let out;
try { out = JSON.parse((await chat(system, user, 600)).match(/\{[\s\S]*\}/)[0]); }
catch (e) { console.error("генерация не удалась:", String(e).slice(0, 160)); process.exit(1); }

const spec = {
  hook: (out.hook || "").trim(),
  script: (out.script || "").trim(),
  ctaTitle: (out.ctaTitle || "Попробуй\nбесплатно").trim(),
  accent: accentFor(nicheId),
  niche: nicheId,
  platform: platformId,
};
mkdirSync(join(root, "remotion", "run"), { recursive: true });
writeFileSync(join(root, "remotion", "run", "spec_0.json"), JSON.stringify(spec, null, 2));
console.log(`✓ ${getNiche(nicheId).name} × ${getPlatform(platformId).name}`);
console.log("  hook:", spec.hook);
console.log("  script:", spec.script);
console.log("  cta:", spec.ctaTitle.replace(/\n/g, " "), "| accent:", spec.accent);

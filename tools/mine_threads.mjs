// Майнер Threads: быстро залетающие посты в нише → паттерн «короткого провокационного».
// Запуск: ENSEMBLEDATA_TOKEN=... node tools/mine_threads.mjs ["kw1,kw2,..."]
// Выход: mining/threads_winners.json (топ по вовлечённости/час: текст + метрики + ссылка).
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.ENSEMBLEDATA_TOKEN;
if (!TOKEN) { console.error("нет ENSEMBLEDATA_TOKEN"); process.exit(1); }
const BASE = "https://ensembledata.com/apis";

// Ниша + провокационные углы (RU+EN). Расширяемо первым аргументом.
const keywords = (process.argv[2] ||
  "meal prep,what to eat,what to cook,healthy dinner,weight loss food,recipe,план питания,что приготовить,правильное питание,похудение")
  .split(",").map((s) => s.trim()).filter(Boolean);

// Релевантность: пост хотя бы косвенно про еду/готовку/питание/диету/продукты.
const RELEVANCE = [
  "рецепт","готов","приготов","еда","блюд","кухн","вкус","ужин","обед","завтрак","перекус","поесть",
  "продукт","холодильник","мяс","курин","овощ","суп","салат","питани","рацион","диет","похуд","ккал",
  "калори","белк","бжу","меню","покупк","экономи","зож",
  "meal","prep","recipe","food","cook","dinner","lunch","eat","diet","calorie","protein","healthy","grocery","fridge","snack",
  ...(process.env.MINE_RELEVANCE || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
];
const NO_FILTER = process.env.MINE_NO_FILTER === "1";
const isRelevant = (t) => {
  if (NO_FILTER) return true;
  const d = (t || "").toLowerCase();
  return d ? RELEVANCE.some((x) => d.includes(x)) : false;
};

const get = async (path, params) => {
  const u = new URL(BASE + path);
  Object.entries({ ...params, token: TOKEN }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  return r.json().catch(() => ({}));
};
const post0 = (node) => node?.thread?.thread_items?.[0]?.post || null;

const now = Date.now() / 1000;
const rows = [];
let dropped = 0;
for (const kw of keywords) {
  const j = await get("/threads/keyword/search", { name: kw });
  for (const node of j.data || []) {
    const p = post0(node.node);
    if (!p) continue;
    const text = (p.caption?.text || "").replace(/\s+/g, " ").trim();
    const likes = p.like_count || 0;
    const tpi = p.text_post_app_info || {};
    const replies = tpi.direct_reply_count || 0, reposts = tpi.repost_count || 0, quotes = tpi.quote_count || 0;
    const ct = p.taken_at || 0;
    const ageH = ct ? Math.max(1, (now - ct) / 3600) : 1e9;
    if (ageH > 24 * 60) continue;                 // относительно свежее (≤60 дней)
    if (!isRelevant(text)) { dropped++; continue; }
    const score = likes + reposts * 2 + quotes * 2 + replies * 1.5; // репосты/цитаты = сильный сигнал
    if (score < 20) continue;
    rows.push({
      user: p.user?.username || "",
      text: text.slice(0, 280),
      likes, replies, reposts, quotes,
      score: Math.round(score),
      eph: Math.round(score / ageH * 10) / 10,    // engagement per hour (скорость)
      age_days: Math.round(ageH / 24 * 10) / 10,
      url: p.code ? `https://www.threads.net/@${p.user?.username}/post/${p.code}` : "",
      kw,
    });
  }
}

const seen = new Set();
const winners = rows.sort((a, b) => b.eph - a.eph)
  .filter((r) => r.text && !seen.has(r.text) && seen.add(r.text)).slice(0, 15);

mkdirSync(join(root, "mining"), { recursive: true });
const outFile = join(root, "mining", "threads_winners.json");
// Если ничего не нашли (часто — дневной лимит API), НЕ затираем кэш с прошлого удачного прогона.
if (winners.length === 0) {
  console.log("⚠ 0 победителей (возможно, лимит API) — оставляю прошлый кэш threads_winners.json нетронутым");
} else {
  writeFileSync(outFile, JSON.stringify(winners, null, 2));
}
console.log(`Threads-победителей: ${winners.length} | отфильтровано нерелевантных: ${dropped} (запросов ~${keywords.length})\n`);
for (const w of winners.slice(0, 12))
  console.log(`  ${String(w.eph).padStart(6)} e/ч | ❤${String(w.likes).padStart(6)} 💬${String(w.replies).padStart(4)} 🔁${String(w.reposts).padStart(4)} | ${w.age_days}d | ${w.text.slice(0, 70)}`);
console.log("\n→ mining/threads_winners.json");

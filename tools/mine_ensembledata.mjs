// WF1-движок: майнинг трендовых роликов TikTok через EnsembleData → ранжирование по скорости.
// Запуск:  ENSEMBLEDATA_TOKEN=... node tools/mine_ensembledata.mjs [hashtags] [keywords]
//   hashtags/keywords — через запятую. По умолчанию — фуд/meal-planning сет.
// Выход: mining/winners.json (топ победителей с метриками + ссылками).
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.ENSEMBLEDATA_TOKEN;
if (!TOKEN) { console.error("нет ENSEMBLEDATA_TOKEN"); process.exit(1); }
const BASE = "https://ensembledata.com/apis";

const hashtags = (process.argv[2] || "чтоприготовить,рецепты,ужин,mealprep").split(",").map((s) => s.trim()).filter(Boolean);
const keywords = (process.argv[3] || "что приготовить,идея для ужина").split(",").map((s) => s.trim()).filter(Boolean);

const get = async (path, params) => {
  const u = new URL(BASE + path);
  Object.entries({ ...params, token: TOKEN }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  return r.json().catch(() => ({}));
};
const list = (d) => {
  let x = d?.data ?? d;
  if (x && !Array.isArray(x)) x = x.data ?? [];
  return Array.isArray(x) ? x : [];
};

const now = Date.now() / 1000;
const rows = [];
const push = (items, source) => {
  for (const it of items) {
    const a = it.aweme_info || it;
    if (!a || typeof a !== "object") continue;
    const st = a.statistics || {};
    const plays = st.play_count || 0, likes = st.digg_count || 0, com = st.comment_count || 0, sh = st.share_count || 0;
    const ct = a.create_time || 0;
    const ageH = ct ? Math.max(1, (now - ct) / 3600) : 1e9;
    if (plays < 5000 || ageH > 24 * 45) continue;
    const aid = a.aweme_id || "";
    const author = (a.author || {}).unique_id || "";
    rows.push({
      desc: (a.desc || "").replace(/\n/g, " ").slice(0, 120),
      plays, likes, comments: com,
      vph: Math.round(plays / ageH),
      eng: plays ? Math.round(((sh * 3 + com * 1.5 + likes) / plays) * 1000) / 10 : 0,
      age_days: Math.round((ageH / 24) * 10) / 10,
      url: a.share_url || (aid ? `https://www.tiktok.com/@${author}/video/${aid}` : ""),
      source,
    });
  }
};

for (const h of hashtags) push(list(await get("/tt/hashtag/posts", { name: h })), `#${h}`);
for (const k of keywords) push(list(await get("/tt/keyword/search", { name: k, period: 30 })), `kw:${k}`);

// dedupe по url, сортировка по скорости
const seen = new Set();
const winners = rows.sort((a, b) => b.vph - a.vph).filter((r) => r.url && !seen.has(r.url) && seen.add(r.url)).slice(0, 10);

mkdirSync(join(root, "mining"), { recursive: true });
writeFileSync(join(root, "mining", "winners.json"), JSON.stringify(winners, null, 2));
console.log(`Победителей: ${winners.length} (запросов ~${hashtags.length + keywords.length} юнитов)\n`);
for (const w of winners) console.log(`  ${String(w.vph).padStart(8)} v/ч | ${String(w.plays).padStart(9)} | eng ${w.eng}% | ${w.age_days}d | ${w.desc.slice(0, 60)}`);
console.log("\n→ mining/winners.json");

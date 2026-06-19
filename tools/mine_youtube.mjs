// Майнер трендов через YouTube Data API (бесплатно, щедрая квота — обход лимита EnsembleData).
// Топ-ролики ниши по просмотрам + превью-кадры (эталон для критика). Пишет mining/winners.json
// в ТОМ ЖЕ формате, что и mine_ensembledata, — drop-in для пайплайна и критика.
// Запуск: YOUTUBE_API_KEY=... node tools/mine_youtube.mjs ["kw1,kw2,..."]
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.error("нет YOUTUBE_API_KEY"); process.exit(1); }
const API = "https://www.googleapis.com/youtube/v3";

const keywords = (process.argv[2] ||
  "что приготовить,рецепт ужин,пп рецепты,быстрый ужин,меню на неделю,правильное питание,экономия на еде")
  .split(",").map((s) => s.trim()).filter(Boolean);

const RELEVANCE = [
  "рецепт", "готов", "приготов", "еда", "блюд", "кухн", "вкус", "ужин", "обед", "завтрак", "перекус", "поесть",
  "продукт", "холодильник", "мяс", "курин", "овощ", "суп", "салат", "питани", "рацион", "диет", "похуд", "ккал",
  "калори", "белк", "бжу", "пп", "меню", "покупк", "экономи", "зож", "perekus",
  "meal", "recipe", "food", "cook", "dinner", "lunch", "eat", "diet", "shorts",
];
const NO_FILTER = process.env.MINE_NO_FILTER === "1";
const isRelevant = (t) => NO_FILTER || (t ? RELEVANCE.some((x) => t.toLowerCase().includes(x)) : false);

const get = async (path, params) => {
  const u = new URL(API + path);
  Object.entries({ ...params, key: KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  const j = await r.json();
  if (j.error) throw new Error("YouTube: " + JSON.stringify(j.error).slice(0, 200));
  return j;
};

const publishedAfter = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(); // свежее 45 дней
const now = Date.now() / 1000;

// 1) поиск свежих популярных коротких видео по ключам → собрать videoId
const ids = new Map(); // id -> {title, thumb, publishedAt}
for (const q of keywords) {
  try {
    const j = await get("/search", {
      part: "snippet", q, type: "video", order: "viewCount", maxResults: "25",
      publishedAfter, regionCode: "RU", relevanceLanguage: "ru", videoDuration: "short",
    });
    for (const it of j.items || []) {
      const id = it.id?.videoId; if (!id) continue;
      const sn = it.snippet || {};
      const thumb = sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      if (!ids.has(id)) ids.set(id, { title: sn.title || "", thumb, publishedAt: sn.publishedAt });
    }
  } catch (e) { console.error("  поиск упал:", String(e).slice(0, 120)); }
}

// 2) статистика по видео (просмотры/лайки) пачками по 50
const rows = [];
const allIds = [...ids.keys()];
let dropped = 0;
for (let i = 0; i < allIds.length; i += 50) {
  const batch = allIds.slice(i, i + 50);
  const j = await get("/videos", { part: "statistics,snippet", id: batch.join(",") });
  for (const it of j.items || []) {
    const id = it.id;
    const meta = ids.get(id) || {};
    const title = (it.snippet?.title || meta.title || "").replace(/\n/g, " ").slice(0, 120);
    if (!isRelevant(title)) { dropped++; continue; }
    const views = Number(it.statistics?.viewCount || 0);
    const likes = Number(it.statistics?.likeCount || 0);
    const com = Number(it.statistics?.commentCount || 0);
    const ct = meta.publishedAt ? new Date(meta.publishedAt).getTime() / 1000 : 0;
    const ageH = ct ? Math.max(1, (now - ct) / 3600) : 1e9;
    if (views < 3000) continue;
    rows.push({
      desc: title,
      plays: views, likes, comments: com,
      vph: Math.round(views / ageH),
      eng: views ? Math.round(((com * 1.5 + likes) / views) * 1000) / 10 : 0,
      age_days: Math.round((ageH / 24) * 10) / 10,
      url: `https://www.youtube.com/watch?v=${id}`,
      cover: meta.thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      media: `https://www.youtube.com/watch?v=${id}`,
      source: "youtube",
    });
  }
}

const winners = rows.sort((a, b) => b.vph - a.vph).slice(0, 12);
mkdirSync(join(root, "mining"), { recursive: true });
if (winners.length === 0) {
  console.log("⚠ 0 победителей — оставляю прошлый кэш winners.json");
} else {
  writeFileSync(join(root, "mining", "winners.json"), JSON.stringify(winners, null, 2));
}
console.log(`YouTube-победителей: ${winners.length} | отфильтровано: ${dropped} (запросов: ${keywords.length})\n`);
for (const w of winners) console.log(`  ${String(w.vph).padStart(8)} v/ч | ${String(w.plays).padStart(9)} | ${w.age_days}d | ${w.desc.slice(0, 60)}`);
console.log("\n→ mining/winners.json (cover = превью YouTube, для критика)");

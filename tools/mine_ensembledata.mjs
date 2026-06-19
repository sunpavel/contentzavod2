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

// Релевантность: берём ролик, только если его описание хотя бы КОСВЕННО про еду/готовку/
// питание/продукты — иначе хэштег-лента приносит залетевший офтоп (тег прилепили к чужому виралу).
// Список широкий («косвенно подходит»). Расширить: MINE_RELEVANCE="термин,термин". Выключить: MINE_NO_FILTER=1.
const RELEVANCE = [
  // готовка / еда
  "рецепт", "готов", "приготов", "еда", "блюд", "кухн", "вкус", "ужин", "обед", "завтрак", "перекус", "поесть", "покушать", "ланч", "снек", "снэк",
  // ингредиенты / продукты
  "продукт", "холодильник", "мясо", "курин", "куриц", "говядин", "фарш", "рыб", "овощ", "фрукт", "яйц", "сыр", "паст", "макарон", "рис", "гречк", "картош", "картоф", "суп", "салат", "соус", "тесто", "выпечк", "десерт", "торт", "перекус",
  // питание / диета / здоровье
  "питани", "рацион", "диет", "похуд", "ккал", "калори", "белк", "бжу", "углевод", "жир", " пп", "пп ", "#пп", "меню", "зож", "здоров",
  // покупки / экономия
  "покупк", "экономи", "бюджет", "дешев", "недорог",
  // англ / транслит
  "meal", "prep", "recipe", "food", "cook", "dinner", "lunch", "breakfast", "grocery", "diet", "calorie", "protein", "healthy", "eat", "tasty", "kitchen",
  // наш домен
  "что приготов", "что готов", "идея для", "на ужин", "на неделю", "что съесть", "нечего есть",
  ...(process.env.MINE_RELEVANCE || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
];
const NO_FILTER = process.env.MINE_NO_FILTER === "1";
const isRelevant = (desc) => {
  if (NO_FILTER) return true;
  const d = (desc || "").toLowerCase();
  if (!d) return false; // нет описания — не можем подтвердить релевантность, пропускаем
  return RELEVANCE.some((t) => d.includes(t));
};
let dropped = 0;

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
    const desc = (a.desc || "").replace(/\n/g, " ").slice(0, 120);
    if (!isRelevant(desc)) { dropped++; continue; } // релевантность-гейт
    const aid = a.aweme_id || "";
    const author = (a.author || {}).unique_id || "";
    rows.push({
      desc,
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
// При 0 результатов (часто — дневной лимит API) НЕ затираем кэш прошлого удачного прогона.
if (winners.length === 0) {
  console.log("⚠ 0 победителей (возможно, лимит API) — оставляю прошлый кэш mining/winners.json");
} else {
  writeFileSync(join(root, "mining", "winners.json"), JSON.stringify(winners, null, 2));
}
console.log(`Победителей: ${winners.length} | отфильтровано как нерелевантные: ${dropped}${NO_FILTER ? " (фильтр ВЫКЛ)" : ""} (запросов ~${hashtags.length + keywords.length} юнитов)\n`);
for (const w of winners) console.log(`  ${String(w.vph).padStart(8)} v/ч | ${String(w.plays).padStart(9)} | eng ${w.eng}% | ${w.age_days}d | ${w.desc.slice(0, 60)}`);
console.log("\n→ mining/winners.json");

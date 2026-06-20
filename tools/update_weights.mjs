// Метрики постов → веса ниш/площадок → config/weights.json (его читает next_target).
// Вход: mining/post_metrics.json — массив {niche, platform, views, likes?} (по одному на замеренный пост;
//        заполняется tools/fetch_metrics.mjs или вручную). Нет данных по группе → нейтральный вес 1.0.
// Запуск: node tools/update_weights.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mp = join(root, "mining", "post_metrics.json");
if (!existsSync(mp)) { console.log("нет mining/post_metrics.json — сначала собери метрики (fetch_metrics)"); process.exit(0); }

const rows = JSON.parse(readFileSync(mp, "utf8")).filter((r) => r && r.niche && r.platform);
if (rows.length < 3) { console.log(`мало данных (${rows.length}) — оставляю round-robin, веса не пишу`); process.exit(0); }

const score = (r) => Number(r.views || 0) + Number(r.likes || 0) * 20; // лайки весомее показов
const avgBy = (key) => {
  const m = {};
  for (const r of rows) { (m[r[key]] ||= []).push(score(r)); }
  const out = {};
  for (const k of Object.keys(m)) out[k] = m[k].reduce((a, b) => a + b, 0) / m[k].length;
  return out;
};
const nicheAvg = avgBy("niche"), platAvg = avgBy("platform");
const overall = rows.reduce((a, r) => a + score(r), 0) / rows.length || 1;
const clamp = (x) => Math.max(0.4, Math.min(2.0, x));
const toW = (avgs) => Object.fromEntries(Object.entries(avgs).map(([k, v]) => [k, Math.round(clamp(v / overall) * 100) / 100]));

const weights = { niche: toW(nicheAvg), platform: toW(platAvg), updated: new Date().toISOString(), n: rows.length };
writeFileSync(join(root, "config", "weights.json"), JSON.stringify(weights, null, 2));
console.log("✓ config/weights.json обновлён по", rows.length, "постам:");
console.log("  ниши:    ", JSON.stringify(weights.niche));
console.log("  площадки:", JSON.stringify(weights.platform));

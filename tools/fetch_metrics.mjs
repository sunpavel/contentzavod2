// Собирает метрики наших постов → mining/post_metrics.json (для update_weights).
// v1: YouTube (есть Data API доступ) — тянет просмотры наших Shorts и матчит к post_log по заголовку≈хуку.
// IG/Threads: нужен Graph API инсайтов — пока заполняется вручную или позже.
// Env: YOUTUBE_API_KEY (или YOUTUBE_ACCESS_TOKEN) + YOUTUBE_CHANNEL_ID.
// Запуск: node tools/fetch_metrics.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.YOUTUBE_API_KEY;
const TOKEN = process.env.YOUTUBE_ACCESS_TOKEN;
const CH = process.env.YOUTUBE_CHANNEL_ID;
const API = "https://www.googleapis.com/youtube/v3";

const logPath = join(root, "mining", "post_log.json");
if (!existsSync(logPath)) { console.log("нет mining/post_log.json — ещё нечего мерить"); process.exit(0); }
const log = JSON.parse(readFileSync(logPath, "utf8"));

const metricsPath = join(root, "mining", "post_metrics.json");
let metrics = [];
if (existsSync(metricsPath)) { try { metrics = JSON.parse(readFileSync(metricsPath, "utf8")); } catch {} }
const seen = new Set(metrics.map((m) => m.key));

const norm = (s) => (s || "").toLowerCase().replace(/[^a-zа-я0-9 ]/gi, "").trim().slice(0, 40);

if ((KEY || TOKEN) && CH) {
  const get = async (path, params) => {
    const u = new URL(API + path);
    Object.entries(TOKEN ? params : { ...params, key: KEY }).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u, TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : undefined);
    return r.json();
  };
  try {
    const ch = await get("/channels", { part: "contentDetails", id: CH });
    const up = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (up) {
      const pl = await get("/playlistItems", { part: "snippet", playlistId: up, maxResults: "50" });
      const vids = (pl.items || []).map((i) => ({ id: i.snippet?.resourceId?.videoId, title: i.snippet?.title }));
      const stats = await get("/videos", { part: "statistics", id: vids.map((v) => v.id).filter(Boolean).join(",") });
      const statById = Object.fromEntries((stats.items || []).map((v) => [v.id, v.statistics || {}]));
      const ytLog = log.filter((l) => l.platform === "youtube");
      let added = 0;
      for (const v of vids) {
        const match = ytLog.find((l) => norm(l.hook) && norm(v.title).includes(norm(l.hook).slice(0, 20)));
        if (!match) continue;
        const key = "yt:" + v.id;
        if (seen.has(key)) continue;
        const st = statById[v.id] || {};
        metrics.push({ key, niche: match.niche, platform: "youtube", views: Number(st.viewCount || 0), likes: Number(st.likeCount || 0) });
        seen.add(key); added++;
      }
      console.log(`YouTube: добавлено ${added} замеров`);
    }
  } catch (e) { console.log("YouTube метрики недоступны:", String(e).slice(0, 140)); }
} else {
  console.log("⚠ для YouTube-метрик задай YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID (публичные данные канала)");
}

writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
console.log(`✓ mining/post_metrics.json: ${metrics.length} замеров. Дальше: node tools/update_weights.mjs`);
console.log("  (IG/Threads-инсайты — следующий шаг, нужен Graph API)");

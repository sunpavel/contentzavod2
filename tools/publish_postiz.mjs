// Публикация ролика через Postiz (self-host или облако).
// Запуск: node tools/publish_postiz.mjs <video.mp4> "<caption>" [now|ISO-date]
// Env:
//   POSTIZ_URL       база до /public/v1, напр. https://postiz.твойдомен/public/v1
//   POSTIZ_API_KEY   Settings > Developers > Public API
//   POSTIZ_CHANNELS  "id:tiktok,id:instagram,id:youtube"  (id интеграций + тип площадки)
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const [, , videoPath, caption, whenArg] = process.argv;
const BASE = process.env.POSTIZ_URL;
const KEY = process.env.POSTIZ_API_KEY;
const CH = process.env.POSTIZ_CHANNELS || "";
if (!videoPath || !caption) {
  console.error("usage: node publish_postiz.mjs <video.mp4> <caption> [now|ISO]");
  process.exit(1);
}
if (!BASE || !KEY) {
  console.error("нет POSTIZ_URL / POSTIZ_API_KEY");
  process.exit(1);
}
const channels = CH.split(",").map((s) => s.trim()).filter(Boolean).map((p) => {
  const [id, type] = p.split(":");
  return { id, type: type || "x" };
});
if (!channels.length) {
  console.error("нет POSTIZ_CHANNELS (формат id:tiktok,id:instagram)");
  process.exit(1);
}

// 1) загрузка медиа
const buf = readFileSync(videoPath);
const form = new FormData();
form.append("file", new Blob([buf], { type: "video/mp4" }), basename(videoPath));
let r = await fetch(`${BASE}/upload`, { method: "POST", headers: { Authorization: KEY }, body: form });
const media = await r.json().catch(() => ({}));
if (!media?.id) {
  console.error("upload fail:", JSON.stringify(media).slice(0, 300));
  process.exit(1);
}
console.log("✓ загружено:", media.id);

// 2) создание поста
const when = whenArg && whenArg !== "now" ? whenArg : null;
const body = {
  type: when ? "schedule" : "now",
  ...(when ? { date: when } : {}),
  shortLink: false,
  tags: [],
  posts: channels.map((c) => ({
    integration: { id: c.id },
    value: [{ content: caption, image: [{ id: media.id, path: media.path }] }],
    settings: { __type: c.type },
  })),
};
r = await fetch(`${BASE}/posts`, {
  method: "POST",
  headers: { Authorization: KEY, "content-type": "application/json" },
  body: JSON.stringify(body),
});
const res = await r.json().catch(() => ({}));
if (r.ok) console.log("✓ опубликовано:", channels.map((c) => c.type).join(", "), "—", JSON.stringify(res).slice(0, 200));
else {
  console.error("post fail:", JSON.stringify(res).slice(0, 400));
  process.exit(1);
}

// Публикация ролика через Blotato.
// Запуск: node tools/publish_blotato.mjs <video.mp4|public-url> "<caption>"
// Env:
//   BLOTATO_API_KEY
//   BLOTATO_ACCOUNTS="instagram:ID,tiktok:ID,youtube:ID"  (id из tools/blotato_accounts.mjs)
// Локальный файл сначала заливается на публичный URL (catbox — стопгап; в проде — свой S3/Bunny).
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const API = "https://backend.blotato.com/v2";
const [, , media, caption] = process.argv;
const KEY = process.env.BLOTATO_API_KEY;
const ACC = process.env.BLOTATO_ACCOUNTS || "";
if (!media || !caption) {
  console.error('usage: node publish_blotato.mjs <video.mp4|url> "<caption>"');
  process.exit(1);
}
if (!KEY) { console.error("нет BLOTATO_API_KEY"); process.exit(1); }
const accounts = ACC.split(",").map((s) => s.trim()).filter(Boolean).map((p) => {
  const [platform, id] = p.split(":");
  return { platform, id };
});
if (!accounts.length) { console.error("нет BLOTATO_ACCOUNTS (формат platform:id)"); process.exit(1); }

// 1) публичный URL медиа
let url = media;
if (existsSync(media)) {
  const buf = readFileSync(media);
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", new Blob([buf], { type: "video/mp4" }), basename(media));
  const r = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form });
  url = (await r.text()).trim();
  if (!url.startsWith("http")) { console.error("хостинг медиа упал:", url.slice(0, 200)); process.exit(1); }
  console.log("✓ медиа на публичном URL:", url);
}

// 2) (опц.) прогнать через Blotato media
let mediaUrl = url;
try {
  const r = await fetch(`${API}/media`, {
    method: "POST",
    headers: { "blotato-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const j = await r.json();
  if (j?.url) mediaUrl = j.url;
} catch {}

// 3) публикация по каждому аккаунту
let ok = 0;
for (const a of accounts) {
  const content = { text: caption, platform: a.platform, mediaUrls: [mediaUrl] };
  const target =
    a.platform === "youtube"
      ? { targetType: "youtube", title: caption.split("\n")[0].slice(0, 90), privacyStatus: "public" }
      : { targetType: a.platform };
  const body = { post: { accountId: a.id, target, content } };
  const r = await fetch(`${API}/posts`, {
    method: "POST",
    headers: { "blotato-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok) { console.log(`✓ ${a.platform}:`, JSON.stringify(j).slice(0, 150)); ok++; }
  else console.error(`✗ ${a.platform}:`, JSON.stringify(j).slice(0, 250));
}
process.exit(ok ? 0 : 1);

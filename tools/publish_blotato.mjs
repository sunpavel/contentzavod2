// Публикация через Blotato.
// Запуск: node tools/publish_blotato.mjs <video.mp4|url|""> "<caption>" [platformFilter]
//   media ""  → текстовый пост (mediaUrls:[]) — для Threads
//   platformFilter "youtube" или "youtube,threads" → постить ТОЛЬКО на эти площадки
// Env: BLOTATO_API_KEY, BLOTATO_ACCOUNTS="instagram:ID,tiktok:ID,youtube:ID,threads:ID"
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const API = "https://backend.blotato.com/v2";
const [, , media, caption, platformFilter] = process.argv;
const KEY = process.env.BLOTATO_API_KEY;
const ACC = process.env.BLOTATO_ACCOUNTS || "";
if (media === undefined || !caption) {
  console.error('usage: node publish_blotato.mjs <video.mp4|url|""> "<caption>" [platformFilter]');
  process.exit(1);
}
if (!KEY) { console.error("нет BLOTATO_API_KEY"); process.exit(1); }
const only = (platformFilter || "").split(",").map((s) => s.trim()).filter(Boolean);
const accounts = ACC.split(",").map((s) => s.trim()).filter(Boolean).map((p) => {
  const [platform, id] = p.split(":");
  return { platform, id };
}).filter((a) => !only.length || only.includes(a.platform));
if (!accounts.length) { console.error("нет подходящих BLOTATO_ACCOUNTS (формат platform:id, фильтр:", only.join(",") || "нет", ")"); process.exit(1); }

// 1) публичный URL медиа (litterbox 72ч). Пусто/нет файла → текстовый пост.
const textOnly = !media || !existsSync(media);
let mediaUrl = "";
if (!textOnly) {
  let url = media;
  if (existsSync(media)) {
    const buf = readFileSync(media);
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("time", "72h");
    const isImg = /\.(png|jpg|jpeg)$/i.test(media);
    form.append("fileToUpload", new Blob([buf], { type: isImg ? "image/png" : "video/mp4" }), basename(media));
    const r = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", { method: "POST", body: form });
    url = (await r.text()).trim();
    if (!url.startsWith("http")) { console.error("хостинг медиа упал:", url.slice(0, 200)); process.exit(1); }
    console.log("✓ медиа на публичном URL:", url);
  }
  mediaUrl = url;
  try {
    const r = await fetch(`${API}/media`, { method: "POST", headers: { "blotato-api-key": KEY, "content-type": "application/json" }, body: JSON.stringify({ url }) });
    const j = await r.json();
    if (j?.url) mediaUrl = j.url;
  } catch {}
}

// Instagram запрещает >5 хэштегов — обрезаем хэштег-блок до 5 для этой площадки.
const capHashtags = (text, max) => {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const tags = lines[i].match(/#[^\s#]+/g);
    if (tags && tags.length) {
      if (tags.length > max) lines[i] = tags.slice(0, max).join(" ");
      break;
    }
  }
  return lines.join("\n");
};

// 3) публикация по каждому аккаунту
let ok = 0;
for (const a of accounts) {
  const text = a.platform === "instagram" ? capHashtags(caption, 5) : caption;
  const content = { text, platform: a.platform, mediaUrls: textOnly ? [] : [mediaUrl] };
  const target =
    a.platform === "youtube"
      ? { targetType: "youtube", title: caption.split("\n")[0].slice(0, 90), privacyStatus: "public", shouldNotifySubscribers: false }
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

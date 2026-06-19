// Публикация ТЕКСТОВОГО поста: Threads (чистый текст) + Instagram (карточка-картинка + подпись).
// Запуск: node tools/publish_text.mjs [index]      (index в mining/text_posts.json, по умолчанию 0)
// Env: BLOTATO_API_KEY, BLOTATO_ACCOUNTS="threads:ID,instagram:ID"
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://backend.blotato.com/v2";
const KEY = process.env.BLOTATO_API_KEY;
const ACC = process.env.BLOTATO_ACCOUNTS || "";
const idx = Number(process.argv[2] || 0);
if (!KEY) { console.error("нет BLOTATO_API_KEY"); process.exit(1); }

const posts = JSON.parse(readFileSync(join(root, "mining", "text_posts.json"), "utf8"));
const p = posts[idx];
if (!p) { console.error("нет поста с индексом", idx); process.exit(1); }

const accounts = ACC.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
  const [platform, id] = s.split(":"); return { platform, id };
}).filter((a) => a.platform === "threads" || a.platform === "instagram");
if (!accounts.length) { console.error("нет threads/instagram в BLOTATO_ACCOUNTS"); process.exit(1); }

// IG: максимум 5 хэштегов
const capHashtags = (text, max) => {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const tags = lines[i].match(/#[^\s#]+/g);
    if (tags && tags.length) { if (tags.length > max) lines[i] = tags.slice(0, max).join(" "); break; }
  }
  return lines.join("\n");
};

const blotatoPost = async (accountId, target, content) => {
  const r = await fetch(`${API}/posts`, {
    method: "POST",
    headers: { "blotato-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ post: { accountId, target, content } }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j };
};

const uploadPublic = (file) => {
  const buf = readFileSync(file);
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("time", "72h");
  form.append("fileToUpload", new Blob([buf], { type: "image/png" }), basename(file));
  return fetch("https://litterbox.catbox.moe/resources/internals/api.php", { method: "POST", body: form })
    .then((r) => r.text()).then((t) => t.trim());
};

let ok = 0;
for (const a of accounts) {
  if (a.platform === "threads") {
    // Threads через Blotato требует поле mediaUrls (для чистого текста — пустой массив).
    const { ok: o, j } = await blotatoPost(a.id, { targetType: "threads" }, { text: p.threads, platform: "threads", mediaUrls: [] });
    if (o) { console.log("✓ threads:", JSON.stringify(j).slice(0, 120)); ok++; }
    else console.error("✗ threads:", JSON.stringify(j).slice(0, 250));
  } else if (a.platform === "instagram") {
    // рендерим карточку
    const png = join(root, "remotion", "out", `_textcard_${idx}.png`);
    const props = JSON.stringify({ card: p.ig_card, accent: "#14C7C0", tag: "AI план питания" });
    const r = spawnSync("npx", ["remotion", "still", "TextCard", png, `--props=${props}`, "--frame=0", "--log=error"], { cwd: join(root, "remotion") });
    if (r.status !== 0 || !existsSync(png)) { console.error("✗ instagram: не отрендерил карточку"); continue; }
    let url = await uploadPublic(png);
    if (!url.startsWith("http")) { console.error("✗ instagram: хостинг карточки упал:", url.slice(0, 120)); continue; }
    let mediaUrl = url;
    try {
      const mr = await fetch(`${API}/media`, { method: "POST", headers: { "blotato-api-key": KEY, "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const mj = await mr.json(); if (mj?.url) mediaUrl = mj.url;
    } catch {}
    const text = capHashtags(p.ig_caption, 5);
    const { ok: o, j } = await blotatoPost(a.id, { targetType: "instagram" }, { text, platform: "instagram", mediaUrls: [mediaUrl] });
    if (o) { console.log("✓ instagram:", JSON.stringify(j).slice(0, 120)); ok++; }
    else console.error("✗ instagram:", JSON.stringify(j).slice(0, 250));
  }
}
process.exit(ok ? 0 : 1);

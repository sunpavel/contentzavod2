// Генерация говорящего видео реального человека (HeyGen) из текста сценария.
// Запуск: HEYGEN_API_KEY=... HEYGEN_AVATAR_ID=... HEYGEN_VOICE_ID=... \
//         node tools/gen_avatar.mjs "<текст реплики>" <out.mp4>
// Возвращает MP4 с человеком за столом, который проговаривает текст (с голосом и синхро губ).
import { writeFileSync } from "node:fs";

const KEY = process.env.HEYGEN_API_KEY;
const AVATAR = process.env.HEYGEN_AVATAR_ID;
const VOICE = process.env.HEYGEN_VOICE_ID;
const W = Number(process.env.HEYGEN_W || 720);
const Hh = Number(process.env.HEYGEN_H || 1280);
const [, , text, out] = process.argv;
if (!KEY || !AVATAR || !VOICE) { console.error("нужны HEYGEN_API_KEY, HEYGEN_AVATAR_ID, HEYGEN_VOICE_ID"); process.exit(1); }
if (!text || !out) { console.error('usage: node gen_avatar.mjs "<текст>" <out.mp4>'); process.exit(1); }

const api = (path, opts = {}) =>
  fetch("https://api.heygen.com" + path, { ...opts, headers: { "x-api-key": KEY, "content-type": "application/json", accept: "application/json", ...(opts.headers || {}) } });

// 1) запустить генерацию (скорость и эмоция — настраиваемые)
const SPEED = Number(process.env.HEYGEN_SPEED || 1.15);          // чуть быстрее обычного
const EMOTION = process.env.HEYGEN_EMOTION || "Excited";          // энергия (если голос поддерживает)
const mkBody = (voice) => ({
  video_inputs: [{
    character: { type: "avatar", avatar_id: AVATAR, avatar_style: "normal" },
    voice,
    background: { type: "color", value: "#0e1116" },
  }],
  dimension: { width: W, height: Hh },
});
const baseVoice = { type: "text", input_text: text, voice_id: VOICE, speed: SPEED };
let gen = await (await api("/v2/video/generate", { method: "POST", body: JSON.stringify(mkBody({ ...baseVoice, emotion: EMOTION })) })).json();
let videoId = gen?.data?.video_id;
if (!videoId) {
  // эмоция могла не поддержаться этим голосом — повтор без неё
  console.log("⚠ повтор без emotion:", JSON.stringify(gen).slice(0, 140));
  gen = await (await api("/v2/video/generate", { method: "POST", body: JSON.stringify(mkBody(baseVoice)) })).json();
  videoId = gen?.data?.video_id;
}
if (!videoId) { console.error("HeyGen не принял запрос:", JSON.stringify(gen).slice(0, 300)); process.exit(1); }
console.log("✓ задача HeyGen:", videoId, "— жду рендер…");

// 2) поллинг статуса
let url = "", durSec = 0;
for (let i = 0; i < 120; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const st = await (await api(`/v1/video_status.get?video_id=${videoId}`)).json();
  const s = st?.data?.status;
  if (s === "completed") { url = st.data.video_url; durSec = st.data.duration || 0; break; }
  if (s === "failed") { console.error("HeyGen render failed:", JSON.stringify(st?.data?.error || st).slice(0, 300)); process.exit(1); }
  if (i % 4 === 0) console.log(`  …${s || "pending"} (${(i + 1) * 5}s)`);
}
if (!url) { console.error("таймаут ожидания HeyGen"); process.exit(1); }

// 3) скачать mp4 + сайдкар с длительностью (для длины композиции)
const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
writeFileSync(out, buf);
const frames = Math.max(1, Math.ceil((durSec || 18) * 30));
writeFileSync(out.replace(/\.mp4$/, "") + ".json", JSON.stringify({ sec: durSec, frames }, null, 2));
console.log(`✓ видео человека сохранено: ${out} (${Math.round(buf.length / 1024)} КБ, ${durSec || "?"}с, ${frames} кадров)`);

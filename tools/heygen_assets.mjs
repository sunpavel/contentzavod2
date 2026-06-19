// Список аватаров и голосов HeyGen → выбрать id для .env (HEYGEN_AVATAR_ID / HEYGEN_VOICE_ID).
// Запуск: HEYGEN_API_KEY=... node tools/heygen_assets.mjs
// Показывает аватары (ищем «сидящих за столом») и РУССКИЕ голоса.
const KEY = process.env.HEYGEN_API_KEY;
if (!KEY) { console.error("нет HEYGEN_API_KEY"); process.exit(1); }
const H = { "x-api-key": KEY, "accept": "application/json" };

const get = async (url) => {
  const r = await fetch(url, { headers: H });
  if (r.status === 401) { console.error("401 — ключ не принят (нужен план с доступом к API)"); process.exit(1); }
  return r.json().catch(() => ({}));
};

const av = await get("https://api.heygen.com/v2/avatars");
const avatars = av?.data?.avatars || av?.avatars || [];
console.log(`\n=== Аватары (${avatars.length}) — ищи «desk/sitting/casual» для «за столом» ===`);
for (const a of avatars.slice(0, 40))
  console.log(`  ${a.avatar_id}   ${a.avatar_name || a.name || ""}  [${a.gender || ""}]`);

const vo = await get("https://api.heygen.com/v2/voices");
const voices = vo?.data?.voices || vo?.voices || [];
const ru = voices.filter((v) => /ru|russ/i.test(`${v.language || ""} ${v.locale || ""}`));
console.log(`\n=== Русские голоса (${ru.length} из ${voices.length}) ===`);
for (const v of ru.slice(0, 30))
  console.log(`  ${v.voice_id}   ${v.name || ""}  [${v.gender || ""}] ${v.language || v.locale || ""}`);

console.log(`\nВыбери и положи в .env:\n  HEYGEN_AVATAR_ID=<avatar_id>\n  HEYGEN_VOICE_ID=<voice_id>`);

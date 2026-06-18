// Список подключённых каналов Postiz → их id для POSTIZ_CHANNELS.
// Запуск: POSTIZ_URL=... POSTIZ_API_KEY=... node tools/postiz_channels.mjs
const BASE = process.env.POSTIZ_URL;
const KEY = process.env.POSTIZ_API_KEY;
if (!BASE || !KEY) {
  console.error("нет POSTIZ_URL / POSTIZ_API_KEY");
  process.exit(1);
}
const r = await fetch(`${BASE}/integrations`, { headers: { Authorization: KEY } });
const list = await r.json().catch(() => []);
const arr = Array.isArray(list) ? list : list?.integrations || [];
if (!arr.length) {
  console.log("каналов нет (подключи аккаунты в UI Postiz)");
  process.exit(0);
}
console.log("Подключённые каналы (id:type для POSTIZ_CHANNELS):\n");
for (const it of arr) {
  console.log(`  ${it.id}:${it.providerIdentifier || it.identifier || it.type}   (${it.name || ""})`);
}
console.log("\nПример: POSTIZ_CHANNELS=\"" + arr.map((it) => `${it.id}:${it.providerIdentifier || it.identifier || "x"}`).join(",") + "\"");

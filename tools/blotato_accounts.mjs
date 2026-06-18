// Список аккаунтов Blotato → их id для BLOTATO_ACCOUNTS. Заодно проверка ключа.
// Запуск: BLOTATO_API_KEY=... node tools/blotato_accounts.mjs
const KEY = process.env.BLOTATO_API_KEY;
if (!KEY) {
  console.error("нет BLOTATO_API_KEY");
  process.exit(1);
}
const r = await fetch("https://backend.blotato.com/v2/users/me/accounts", {
  headers: { "blotato-api-key": KEY, "content-type": "application/json" },
});
if (r.status === 401) {
  console.error("401 Unauthorized — ключ не принят. Проверь, что скопирован целиком (символы / + =) и что API включён в тарифе Blotato.");
  process.exit(1);
}
const j = await r.json().catch(() => ({}));
const arr = Array.isArray(j) ? j : j?.accounts || j?.items || [];
if (!arr.length) {
  console.log("аккаунтов нет (подключи соцсети в Blotato)\nответ:", JSON.stringify(j).slice(0, 300));
  process.exit(0);
}
console.log("Аккаунты Blotato (platform:id для BLOTATO_ACCOUNTS):\n");
for (const a of arr) console.log(`  ${a.platform || a.type}:${a.id}   (${a.name || a.username || ""})`);
console.log("\nПример: BLOTATO_ACCOUNTS=\"" + arr.map((a) => `${a.platform || a.type}:${a.id}`).join(",") + "\"");

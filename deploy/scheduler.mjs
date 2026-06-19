// Планировщик завода для Docker-контейнера (1 процесс, логи в stdout → docker logs).
// Запускает 3 слота в день по МСК. Москва = UTC+3 без перехода на летнее время,
// поэтому считаем смещение фиксированным (-180 минут к UTC).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Слоты в МСК → минута от полуночи UTC. Меняй тут (или переопредели расписание на сервере).
const SLOTS = [
  { hm: "08:00", fmt: "demo", slot: "morning" },
  { hm: "12:30", fmt: "text", slot: "noon" },
  { hm: "17:50", fmt: "creator", slot: "evening" },
].map((s) => {
  const [H, M] = s.hm.split(":").map(Number);
  return { ...s, utcMin: ((H * 60 + M - 180) % 1440 + 1440) % 1440 };
});

const fmtT = (d) => d.toISOString().replace("T", " ").slice(0, 16) + " UTC";

function nextSlot() {
  const now = new Date();
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
  let best = null;
  for (const s of SLOTS) {
    let diff = s.utcMin - cur;
    if (diff <= 0) diff += 1440; // уже прошёл сегодня → завтра
    if (!best || diff < best.diff) best = { s, diff };
  }
  return best;
}

function schedule() {
  const { s, diff } = nextSlot();
  const ms = Math.max(1000, Math.round(diff * 60000));
  const when = new Date(Date.now() + ms);
  console.log(`[scheduler] следующий слот: ${s.slot}/${s.fmt} в ${fmtT(when)} (${s.hm} МСК), через ${(ms / 3600000).toFixed(2)} ч`);
  setTimeout(() => run(s), ms);
}

function run(s) {
  console.log(`[scheduler] === ЗАПУСК ${s.slot}/${s.fmt} @ ${fmtT(new Date())} ===`);
  const p = spawn("bash", [join(ROOT, "tools", "scheduled_run.sh"), s.slot, s.fmt, "1"], { cwd: ROOT, stdio: "inherit" });
  p.on("close", (code) => { console.log(`[scheduler] слот ${s.slot} завершён (код ${code})`); schedule(); });
  p.on("error", (e) => { console.error("[scheduler] ошибка запуска слота:", String(e)); schedule(); });
}

// Самопроверка рендера на старте: рендерим тестовый кадр (Chromium/шрифты/GL).
// Отключить: SELFTEST=0. Не блокирует расписание — просто пишет результат в логи.
function selfTest(done) {
  console.log("[selftest] проверяю рендер (Chromium)…");
  const png = "/tmp/_selftest.png";
  const props = JSON.stringify({ card: "проверка\nрендера", accent: "#14C7C0", tag: "selftest" });
  const extra = (process.env.REMOTION_RENDER_FLAGS || "").split(" ").filter(Boolean);
  const p = spawn("npx", ["remotion", "still", "TextCard", png, `--props=${props}`, "--frame=0", "--log=error", ...extra],
    { cwd: join(ROOT, "remotion"), stdio: "inherit" });
  p.on("close", (code) => {
    if (code === 0 && existsSync(png)) console.log("[selftest] RENDER OK ✓ — рендер в контейнере живой");
    else console.error(`[selftest] RENDER FAIL ✗ (код ${code}) — видео-слоты, вероятно, упадут; пришли логи`);
    done();
  });
  p.on("error", (e) => { console.error("[selftest] RENDER FAIL ✗:", String(e)); done(); });
}

console.log("[scheduler] старт. Слоты (МСК): " + SLOTS.map((s) => `${s.hm}/${s.fmt}`).join(" · "));
if (process.env.SELFTEST === "0") schedule();
else selfTest(() => schedule());

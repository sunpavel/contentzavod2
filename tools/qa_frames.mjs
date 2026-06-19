// Vision-QA готового ролика: рендерит 3 кадра (старт/середина/CTA) и оценивает критиком.
// Запуск: node tools/qa_frames.mjs <brief.json> <props.json> [composition] [minScore]
// Exit 0 — ок (или критик недоступен), 1 — забраковано (score < minScore) → пайплайн не публикует.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compareToTop } from "./critic.mjs";
import { fetchTopFrames } from "./fetch_top_frames.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , briefPath, propsPath, comp = "RealCreatorReel", minArg] = process.argv;
const MIN = Number(minArg || 5);
if (!briefPath || !propsPath) { console.error("usage: qa_frames.mjs <brief.json> <props.json> [comp] [minScore]"); process.exit(0); }

const brief = readFileSync(briefPath, "utf8");
const props = JSON.parse(readFileSync(propsPath, "utf8"));
const af = props.avatarFrames || 480;
const frames = [20, Math.round(af * 0.5), af + 30];
const extra = (process.env.REMOTION_RENDER_FLAGS || "").split(" ").filter(Boolean);

const imgs = [];
frames.forEach((fr, k) => {
  const png = `/tmp/qa_${k}.png`;
  const r = spawnSync("npx", ["remotion", "still", comp, png, `--props=${propsPath}`, `--frame=${fr}`, "--log=error", ...extra], { cwd: join(root, "remotion") });
  if (r.status === 0) imgs.push(png);
});
if (!imgs.length) { console.log("  ⚠ vision-QA: не отрендерил кадры, пропускаю гейт"); process.exit(0); }

let refs = [];
try { refs = await fetchTopFrames(3); } catch {}

let res;
try { res = await compareToTop(brief, imgs, refs); }
catch (e) { console.log("  ⚠ vision-QA недоступен:", String(e).slice(0, 120)); process.exit(0); }
if (res._skip) { console.log("  vision-QA пропущен:", res._skip); process.exit(0); }

const sc = res.score ?? 10;
const vs = refs.length ? `vs ${refs.length} залетевших` : "без эталонов (ещё нет cover в кэше)";
console.log(`  vision-критик (${vs}): ${sc}/10` + ((res.issues || []).length ? " — " + res.issues.slice(0, 3).join("; ") : ""));
process.exit(sc < MIN ? 1 : 0);

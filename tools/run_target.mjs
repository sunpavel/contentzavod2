// Полный прогон под (нишу × площадку): скрипт (с критиком) → видео(HeyGen) ИЛИ текст → публикация ТОЧЕЧНО на одну площадку.
// Запуск: node tools/run_target.mjs <niche> <platform>
//   niche: weight_loss|fitness|family|budget   platform: youtube|instagram|tiktok|threads
//   DRY_RUN=1 — НЕ публиковать и НЕ звать HeyGen (видео переиспользует public/avatar_talk.mp4) — для проверки связки.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildCaption } from "./build_caption.mjs";
import { systemBrief } from "./audience.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , niche = "family", platform = "youtube"] = process.argv;
const DRY = process.env.DRY_RUN === "1";
const node = (script, args) => spawnSync("node", [join(root, "tools", script), ...args], { stdio: "inherit", cwd: root });

// лог опубликованного поста — основа петли аналитики
const logPost = (niche, platform, hook) => {
  const p = join(root, "mining", "post_log.json");
  let log = [];
  try { if (existsSync(p)) log = JSON.parse(readFileSync(p, "utf8")); } catch {}
  log.push({ ts: Date.now(), date: new Date().toISOString().slice(0, 10), niche, platform, hook: (hook || "").slice(0, 120) });
  writeFileSync(p, JSON.stringify(log, null, 2));
};

// 1) скрипт под нишу/площадку (внутри — критик-рефайн)
console.log(`\n▶ скрипт: ${niche} × ${platform}${DRY ? "  [DRY-RUN]" : ""}`);
if (node("gen_script.mjs", [niche, platform]).status !== 0) process.exit(1);
const spec = JSON.parse(readFileSync(join(root, "remotion", "run", "spec_0.json"), "utf8"));
writeFileSync("/tmp/target_brief.txt", systemBrief(niche, platform));

// 2a) ТЕКСТ (Threads) — чистый текст, без видео
if (platform === "threads") {
  const text = `${spec.script}\n\nt.me/foodgenius_ai_bot`;
  console.log("\n▶ текстовый пост (Threads):\n" + text + "\n");
  if (DRY) { console.log("[dry-run] публикацию пропускаю."); process.exit(0); }
  const st = node("publish_blotato.mjs", ["", text, "threads"]).status ?? 1;
  if (st === 0) logPost(niche, "threads", spec.hook);
  process.exit(st);
}

// 2b) ВИДЕО — HeyGen-человек → рендер → публикация на площадку
const avatarMp4 = join(root, "remotion", "public", "avatar_talk.mp4");
if (!DRY) {
  console.log("\n▶ HeyGen — человек проговаривает скрипт…");
  if (spawnSync("node", [join(root, "tools", "gen_avatar.mjs"), spec.script, avatarMp4], { stdio: "inherit", cwd: root }).status !== 0) {
    console.error("HeyGen упал"); process.exit(1);
  }
} else if (!existsSync(avatarMp4)) {
  console.error("[dry-run] нет public/avatar_talk.mp4 для переиспользования — сначала сгенерь один раз."); process.exit(1);
}

const sidecar = join(root, "remotion", "public", "avatar_talk.json");
const frames = existsSync(sidecar) ? JSON.parse(readFileSync(sidecar, "utf8")).frames : 432;
const props = { hook: spec.hook, ctaTitle: spec.ctaTitle, accent: spec.accent, avatarSrc: "avatar_talk.mp4", avatarFrames: frames };
writeFileSync("/tmp/target_props.json", JSON.stringify(props));

const out = join(root, "remotion", "out", `target_${niche}_${platform}.mp4`);
console.log("\n▶ рендер RealCreatorReel…");
if (spawnSync("node", [join(root, "remotion", "render_one.mjs"), "/tmp/target_props.json", out, "RealCreatorReel"], { stdio: "inherit", cwd: root }).status !== 0) {
  console.error("рендер упал"); process.exit(1);
}

// vision-критик (советник, не блокирует)
node("qa_frames.mjs", ["/tmp/target_brief.txt", "/tmp/target_props.json", "RealCreatorReel", "3"]);

const cap = buildCaption(spec, platform);
console.log("\n▶ подпись:\n" + cap + "\n");
if (DRY) { console.log(`[dry-run] публикацию на ${platform} пропускаю. Видео готово: ${out}`); process.exit(0); }
const st = node("publish_blotato.mjs", [out, cap, platform]).status ?? 1;
if (st === 0) logPost(niche, platform, spec.hook);
process.exit(st);

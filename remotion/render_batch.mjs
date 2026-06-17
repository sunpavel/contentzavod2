// Пакетный рендер всех вариантов из props/*.json → out/reel_<name>.mp4
// Запуск: npm run render:batch   (или: node render_batch.mjs)
import { readdirSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const propsDir = join(root, "props");
const outDir = join(root, "out");
mkdirSync(outDir, { recursive: true });

const files = readdirSync(propsDir).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.error("Нет props/*.json — нечего рендерить");
  process.exit(1);
}
console.log(`🎬 Рендерю ${files.length} вариант(ов): ${files.map((f) => basename(f, ".json")).join(", ")}`);

let ok = 0;
for (const f of files) {
  const name = basename(f, ".json");
  const out = join(outDir, `reel_${name}.mp4`);
  console.log(`\n→ ${name}`);
  const r = spawnSync(
    "npx",
    ["remotion", "render", "DemoReel", out, `--props=${join(propsDir, f)}`, "--codec=h264", "--log=error"],
    { cwd: root, stdio: "inherit" }
  );
  if (r.status === 0) { console.log(`✓ ${out}`); ok++; }
  else console.error(`✗ ${name} — ошибка рендера`);
}
console.log(`\nГотово: ${ok}/${files.length}`);
process.exit(ok === files.length ? 0 : 1);

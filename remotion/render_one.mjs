// Одиночный рендер — для вызова заводом (n8n Execute Command).
// Запуск: node render_one.mjs <props.json> <out.mp4> [composition=DemoReel]
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const [, , propsPath, outPath, comp = "DemoReel"] = process.argv;
if (!propsPath || !outPath) {
  console.error("usage: node render_one.mjs <props.json> <out.mp4> [composition]");
  process.exit(1);
}
// Доп.флаги рендера для headless-сервера/Docker (напр. REMOTION_RENDER_FLAGS="--gl=swiftshader")
const extra = (process.env.REMOTION_RENDER_FLAGS || "").split(" ").filter(Boolean);
const r = spawnSync(
  "npx",
  ["remotion", "render", comp, resolve(outPath), `--props=${resolve(propsPath)}`, "--codec=h264", "--log=error", ...extra],
  { cwd: root, stdio: "inherit" }
);
process.exit(r.status ?? 1);

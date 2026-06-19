// Итеративный критик скрипта (≤N, по умолчанию 3): оценка → правка → … → финальная спека в файл.
// Запуск: node tools/refine_spec.mjs <brief.json> <spec.json> [maxIter]
// Дёшево (текст). Останавливается на score>=8 или когда правок нет, или по лимиту итераций.
import { readFileSync, writeFileSync } from "node:fs";
import { scoreScript } from "./critic.mjs";

const [, , briefPath, specPath, maxArg] = process.argv;
const MAX = Number(maxArg || 3);
const THRESH = 8;
if (!briefPath || !specPath) { console.error("usage: refine_spec.mjs <brief.json> <spec.json> [maxIter]"); process.exit(1); }

const brief = readFileSync(briefPath, "utf8");
// продукт обязан остаться в скрипте — иначе правку отбрасываем (критик любит «уплыть» в чужой рецепт)
const hasProduct = (s) => /foodgenius|телеграм|telegram|план питания|список покупок|\bбот\b/i.test(JSON.stringify(s || {}));

let spec = JSON.parse(readFileSync(specPath, "utf8"));
let best = spec, bestScore = -1;

for (let i = 1; i <= MAX; i++) {
  let res;
  try { res = await scoreScript(brief, spec); }
  catch (e) { console.log("  ⚠ критик недоступен:", String(e).slice(0, 120)); break; }
  if (res._skip) { console.log("  критик пропущен:", res._skip); break; }
  const sc = res.score ?? 0;
  console.log(`  критик #${i}: ${sc}/10${(res.issues || []).length ? " — " + res.issues.slice(0, 3).join("; ") : ""}`);
  if (sc > bestScore) { bestScore = sc; best = spec; }       // запоминаем лучшую ВЕРСИЮ (по оценке до правки)
  if (sc >= THRESH || !res.revised) break;
  if (!hasProduct(res.revised)) { console.log("  ⚠ правка убрала продукт — отбрасываю, оставляю лучшую"); break; }
  spec = res.revised;
}
// пишем лучшую версию (а не последнюю — она может быть хуже)
writeFileSync(specPath, JSON.stringify(best, null, 2));
console.log(`  ✓ финальная спека (best ${bestScore}/10): ${specPath}`);

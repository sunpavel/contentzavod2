// Скачивает кадры-обложки топ-роликов из mining/winners.json → /tmp/ref_*.jpg.
// Эти РЕАЛЬНЫЕ кадры залетевших роликов критик сравнивает с нашими.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export async function fetchTopFrames(n = 3) {
  const wPath = join(root, "mining", "winners.json");
  if (!existsSync(wPath)) return [];
  let winners = [];
  try { winners = JSON.parse(readFileSync(wPath, "utf8")); } catch { return []; }
  const withCover = winners.filter((w) => w.cover).slice(0, n);
  const paths = [];
  for (let i = 0; i < withCover.length; i++) {
    try {
      const r = await fetch(withCover[i].cover, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1000) continue;          // не картинка/заглушка
      const p = `/tmp/ref_${i}.jpg`;
      writeFileSync(p, buf);
      paths.push(p);
    } catch {}
  }
  return paths;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const paths = await fetchTopFrames(Number(process.argv[2] || 3));
  console.error(`скачано эталонных кадров: ${paths.length}`);
  process.stdout.write(paths.join(","));
}

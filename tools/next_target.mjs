// Выбор (ниша × площадка) для слота.
// Если есть config/weights.json — ВЗВЕШЕННЫЙ детерминированный выбор (бьём в то, что заходит,
// с «исследованием»-полом, чтобы не схлопнуться). Иначе — round-robin по rotation.
// Запуск: node tools/next_target.mjs [slotIndex=0] [slotsPerDay=3]  → печатает "<niche> <platform>"
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(root, "config", "audience.json"), "utf8"));
const rot = cfg.rotation || [["family", "youtube"]];

const slotIndex = Number(process.argv[2] || 0);
const perDay = Number(process.argv[3] || 3);
const day = Math.floor(Date.now() / 86400000);
const seed = day * perDay + slotIndex;

let weights = null;
const wp = join(root, "config", "weights.json");
if (existsSync(wp)) { try { weights = JSON.parse(readFileSync(wp, "utf8")); } catch {} }

let niche, platform;
if (weights && weights.niche && weights.platform) {
  // вес пары = niche_w * platform_w, с полом FLOOR (исследование)
  const FLOOR = 0.25;
  const w = rot.map(([n, p]) => Math.max(FLOOR, (weights.niche[n] ?? 1) * (weights.platform[p] ?? 1)));
  const total = w.reduce((a, b) => a + b, 0);
  // детерминированный PRNG из seed (mulberry32)
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const rnd = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * total;
  let acc = 0, idx = 0;
  for (let i = 0; i < w.length; i++) { acc += w[i]; if (rnd <= acc) { idx = i; break; } }
  [niche, platform] = rot[idx];
} else {
  // round-robin
  const idx = ((seed % rot.length) + rot.length) % rot.length;
  [niche, platform] = rot[idx];
}
process.stdout.write(`${niche} ${platform}`);

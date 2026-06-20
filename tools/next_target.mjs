// Выбор (ниша × площадка) для слота из ротации config/audience.json.
// Индекс = (день_от_эпохи * слотов_в_день + slotIndex) % длина_ротации → циклично, без повторов подряд.
// Запуск: node tools/next_target.mjs [slotIndex=0] [slotsPerDay=3]  → печатает "<niche> <platform>"
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(root, "config", "audience.json"), "utf8"));
const rot = cfg.rotation || [["family", "youtube"]];

const slotIndex = Number(process.argv[2] || 0);
const perDay = Number(process.argv[3] || 3);
const day = Math.floor(Date.now() / 86400000); // дней от эпохи (UTC)
const idx = ((day * perDay + slotIndex) % rot.length + rot.length) % rot.length;
const [niche, platform] = rot[idx];
process.stdout.write(`${niche} ${platform}`);

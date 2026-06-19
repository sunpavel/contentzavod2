// Генератор ТЕКСТОВЫХ постов (Threads + Instagram) по аналитике залетающих Threads-постов.
// Threads — очень коротко и провокационно (под паттерны, что собирают лайки/ответы).
// Запуск: DEEPSEEK_API_KEY=... node tools/gen_text_posts.mjs [N]
// Вход:   mining/threads_winners.json (если пусто — встроенный фолбэк-паттерн)
// Выход:  mining/text_posts.json  [{threads, ig_card, ig_caption}]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chat } from "./llm.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const N = Number(process.argv[2] || 3);
const LINK = "t.me/foodgenius_ai_bot";

let winners = [];
const wPath = join(root, "mining", "threads_winners.json");
if (existsSync(wPath)) { try { winners = JSON.parse(readFileSync(wPath, "utf8")); } catch {} }

// Паттерны залетающих Threads-постов (из аналитики; фолбэк если майнер пуст)
const PATTERNS = `Паттерны, которые быстро набирают лайки/ответы в Threads (ниша еда/питание):
1) Провокационный вопрос-челлендж против общепринятого («почему мил-преп вообще ок, если…») — провоцирует спор в ответах.
2) Личная история-боль от первого лица → неожиданное простое решение.
3) Релейтбл-признание («я не готовлю ужин уже месяц и вот почему»).
4) Цифра-выгода + «сохрани» (40г белка / 5 минут / 4 дешёвых ужина на ротации).
5) Сериал-челлендж «День N: …» — подписка ради продолжения.
Общее: 1-3 строки, без рекламного тона, разговорно, заканчивается крючком на ответ (вопрос/мнение).`;

const examples = (winners || []).slice(0, 6)
  .map((w) => `- "${(w.text || "").slice(0, 180)}" [❤${w.likes || 0} 💬${w.replies || 0} 🔁${w.reposts || 0}] паттерн: ${w.pattern || ""}`)
  .join("\n");

const system =
  `Ты — SMM-копирайтер бренда FoodGenius (AI-бот в Telegram: за 10 секунд собирает персональный ` +
  `план питания на неделю + список покупок; @foodgenius_ai_bot). Пишешь ТЕКСТОВЫЕ посты под аналитику Threads.\n` +
  PATTERNS +
  `\n\nСделай ${N} РАЗНЫХ постов. Для каждого верни объект:\n` +
  `{\n` +
  `  "threads": "пост для Threads — ОЧЕНЬ КОРОТКИЙ: 1-2 строки, максимум ~150 символов основного текста. ` +
  `Одна провокационная или релейтбл мысль/вопрос про боль «вечно думать что готовить / однообразие / лишние ` +
  `траты / выкинутая еда» — БЕЗ абзацев и перечислений. Можно намекнуть на AI-планировщик одним словом. ` +
  `Заканчивается крючком-вопросом на ответ, и ОТДЕЛЬНОЙ последней строкой ссылка ${LINK}. Эмодзи 0-1. ` +
  `Пример нужной длины: «Готовлю одно и то же уже третью неделю. Это я ленивая или еда переоценена? ${LINK}»",\n` +
  `  "ig_card": "крупная фраза-крючок для картинки Instagram, ≤7 слов, можно 2 строки через \\n",\n` +
  `  "ig_caption": "подпись для Instagram: крючок + одно предложение что делает бот + мягкий призыв + ссылка ${LINK} + 3-5 хэштегов (#рецепты #планпитания …)"\n` +
  `}\n` +
  `ЖЁСТКО: пиши по-русски, живо, без канцелярита и без слова «реклама». Без кликбейта-обмана и медицинских обещаний. ` +
  `НЕ начинай каждый пост одинаково. Верни СТРОГО JSON-массив из ${N} таких объектов.`;

const user = `Примеры реальных залетевших постов (для стиля, не копировать):\n${examples || "(нет — используй паттерны выше)"}\n\nВерни массив из ${N} объектов.`;

let txt = "[]";
try { txt = (await chat(system, user, 2200)) || "[]"; }
catch (e) { console.error(String(e)); process.exit(1); }
const m = txt.match(/\[[\s\S]*\]/);
if (m) txt = m[0];
let posts;
try { posts = JSON.parse(txt); }
catch { console.error("не распарсил ответ модели:", txt.slice(0, 300)); process.exit(1); }

// гарантируем ссылку в обоих текстах
const ensureLink = (s) => (s && s.includes("foodgenius_ai_bot") ? s : `${(s || "").trim()}\n${LINK}`);
posts = posts.map((p) => ({
  threads: ensureLink((p.threads || "").trim()),
  ig_card: (p.ig_card || "").trim(),
  ig_caption: ensureLink((p.ig_caption || "").trim()),
}));

mkdirSync(join(root, "mining"), { recursive: true });
writeFileSync(join(root, "mining", "text_posts.json"), JSON.stringify(posts, null, 2));
console.log(`✓ ${posts.length} текстовых постов → mining/text_posts.json\n`);
posts.forEach((p, i) => {
  console.log(`──────── пост ${i} ────────`);
  console.log("THREADS:\n" + p.threads + "\n");
  console.log("IG CARD: " + p.ig_card.replace(/\n/g, " / "));
  console.log("IG CAPTION:\n" + p.ig_caption + "\n");
});

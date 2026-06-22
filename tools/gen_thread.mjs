// Генератор ВЕТКИ для Threads (ветка из 6-8 твитов, которую алгоритм разгоняет).
// Алгоритм Threads гонит то, что лайкают/комментят/сохраняют в первый час → структура под реакцию:
//   1) хук = боль; 2) команда сохранить; 3..N-1 автономные твиты; N — вопрос, который невозможно проигнорировать.
// Запуск: node tools/gen_thread.mjs <niche>
// Пишет remotion/run/thread_0.json = { niche, platform:"threads", hook, posts:[...] }
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chat } from "./llm.mjs";
import { systemBrief, getNiche } from "./audience.mjs";
import { scoreThread } from "./critic.mjs";
import { findProfanity, hasProfanity } from "./sanitize.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , nicheId = "family"] = process.argv;

// реальные залетевшие заголовки — как эталон силы хука/энергии
let refs = "";
const rp = join(root, "mining", "youtube_refs.json");
if (existsSync(rp)) {
  try {
    const arr = JSON.parse(readFileSync(rp, "utf8")).slice(0, 6);
    if (arr.length) refs = "\nРеальные залетевшие хуки (равняйся на силу, НЕ копируй тему):\n" +
      arr.map((r) => `- «${r.title}»`).join("\n");
  } catch {}
}

const shape = `{"hook":"первый твит — чистая боль ЦА, ≤12 слов","posts":["твит 1 (=hook)","твит 2","...","последний твит — вопрос"]}`;

const system =
  `Ты — автор виральных веток в Threads для FoodGenius (AI-план питания на неделю + список покупок в Telegram, бот @foodgenius_ai_bot). ` +
  systemBrief(nicheId, "threads") +
  ` Алгоритм Threads разгоняет ветки, которые в первый час собирают лайки/комменты/сохранения. Пиши ВЕТКУ из 6-8 твитов СТРОГО так:\n` +
  `1) ТВИТ-ХУК: чистая боль или разрыв шаблона, ≤12 слов, без раскачки — листать невозможно.\n` +
  `2) ВТОРОЙ ТВИТ: явный сигнал ценности / команда сохранить («Сохрани, чтобы не потерять» + что внутри).\n` +
  `3) СЕРЕДИНА: каждый твит АВТОНОМЕН — вырви любой, он несёт законченную мысль/ценность (его репостят отдельно). Конкретика: цифры, шаги, примеры. Без воды.\n` +
  `4) ПОСЛЕДНИЙ ТВИТ: вопрос, который НЕВОЗМОЖНО проигнорировать — острый/личный выбор, провоцирует ответ. Не вялое «а как у вас?».\n` +
  `Продукт FoodGenius впиши естественно (не реклама-в-лоб). Каждый твит ≤280 символов, без эмодзи-спама, без мата. ` +
  `Ссылку на бота НЕ вставляй — её добавят отдельным постом. Верни СТРОГО JSON: ${shape}`;
const user = `Сделай ОДНУ цепляющую ветку под нишу «${getNiche(nicheId).name}».${refs}`;

let out;
try { out = JSON.parse((await chat(system, user, 1200)).match(/\{[\s\S]*\}/)[0]); }
catch (e) { console.error("генерация ветки не удалась:", String(e).slice(0, 160)); process.exit(1); }

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 480);
let posts = (Array.isArray(out.posts) ? out.posts : []).map(clean).filter(Boolean);
if (posts.length < 4) { console.error("ветка слишком короткая (нужно ≥4 твита), получено:", posts.length); process.exit(1); }

let thread = { niche: nicheId, platform: "threads", hook: clean(out.hook) || posts[0], posts };

// критик-рефайн (≤2): рубрика виральной ветки; keep-best, продукт обязателен
const brief = systemBrief(nicheId, "threads");
const keepProduct = (t) => /foodgenius|telegram|телеграм|план питания|список покупок|\bбот\b/i.test(JSON.stringify(t || {}));
let best = thread, bestScore = -1;
for (let i = 0; i < 2; i++) {
  let res;
  try { res = await scoreThread(brief, thread); } catch { break; }
  if (res._skip) break;
  const sc = res.score ?? 0;
  console.log(`  критик ветки #${i + 1}: ${sc}/10` + ((res.issues || []).length ? " — " + res.issues.slice(0, 2).join("; ") : ""));
  if (sc > bestScore) { bestScore = sc; best = thread; }
  const revPosts = res.revised && Array.isArray(res.revised.posts) ? res.revised.posts.map(clean).filter(Boolean) : null;
  if (sc >= 8 || !revPosts || revPosts.length < 4 || !keepProduct(res.revised)) break;
  thread = { niche: nicheId, platform: "threads", hook: clean(res.revised.hook) || revPosts[0], posts: revPosts };
}
thread = best;

// защита бренда: ни одного вульгаризма. Если LLM вставил мат — чистая переписка; не вышло — слот пропускаем.
const dirty = findProfanity(thread.posts.join("\n"));
if (dirty.length) {
  console.error("  ⚠ вульгаризм в ветке: " + dirty.join(", ") + " — переписываю начисто…");
  try {
    const fixSys = system + " ВНИМАНИЕ: прошлая версия содержала вульгарные слова. Перепиши ветку СОВЕРШЕННО чисто, без мата и сленга-вульгаризмов, сохрани структуру, смысл и продукт.";
    const fixUser = `Перепиши эту ветку без вульгарных слов (${dirty.join(", ")}), сохранив структуру и продукт:\n${JSON.stringify(thread)}`;
    const re = JSON.parse((await chat(fixSys, fixUser, 1200)).match(/\{[\s\S]*\}/)[0]);
    const rp = (Array.isArray(re.posts) ? re.posts : []).map(clean).filter(Boolean);
    if (rp.length >= 4 && keepProduct(re)) thread = { niche: nicheId, platform: "threads", hook: clean(re.hook) || rp[0], posts: rp };
  } catch {}
}
if (hasProfanity(thread.posts.join("\n"))) {
  console.error("✗ не удалось очистить ветку от вульгаризмов — слот пропущен (мат на бренд-аккаунте не публикуем).");
  process.exit(1);
}

mkdirSync(join(root, "remotion", "run"), { recursive: true });
writeFileSync(join(root, "remotion", "run", "thread_0.json"), JSON.stringify(thread, null, 2));
console.log(`✓ ветка: ${getNiche(nicheId).name} — ${thread.posts.length} твитов`);
thread.posts.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

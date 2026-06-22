// Доктор веток Threads — диагностика охватов по промптам залетающих авторов.
// Алгоритм Threads разгоняет то, что в первый час лайкают/комментят/сохраняют — здесь разбираем, почему ветка
// не получила реакции, какие паттерны у залетевших и что вернуть, если охваты упали.
//
// Запуск:
//   node tools/threads_doctor.mjs fix      <thread.json>            — ПРОМПТ 3: где теряется реакция, переписать хук и финал
//   node tools/threads_doctor.mjs patterns <threads.json>          — ПРОМПТ 5: 3 общих элемента залетевших, как повторить
//   node tools/threads_doctor.mjs reach    <threads.json>          — ПРОМПТ 6: что изменилось, где потерян алгоритм, 3 действия
//
// Формат входа: JSON. Для fix — {hook?, posts:[...]}. Для patterns/reach — массив
//   [{posts:[...], reach?:число, likes?:число, comments?:число, date?:"YYYY-MM-DD"}, ...].
import { readFileSync } from "node:fs";
import { chat } from "./llm.mjs";

const [, , mode, file] = process.argv;
if (!mode || !file) {
  console.error("usage: node tools/threads_doctor.mjs <fix|patterns|reach> <data.json>");
  process.exit(1);
}
const data = JSON.parse(readFileSync(file, "utf8"));

const SYS =
  "Ты — аналитик роста в Threads для бренда FoodGenius (AI-план питания + список покупок, бот в Telegram). " +
  "Алгоритм Threads разгоняет ветки, которые в ПЕРВЫЙ ЧАС собирают лайки/комменты/сохранения/репосты. " +
  "Сильная ветка: хук-боль ≤12 слов → ранний сигнал сохранить → автономные твиты с конкретикой → финал-вопрос, " +
  "который невозможно проигнорировать. Отвечай по-русски, прямо и по делу, без воды и без общих советов.";

const fmtThread = (t) => (Array.isArray(t.posts) ? t.posts : []).map((p, i) => `  ${i + 1}. ${p}`).join("\n");
const fmtList = (arr) =>
  arr.map((t, i) => {
    const m = [t.reach != null ? `охват ${t.reach}` : null, t.likes != null ? `лайки ${t.likes}` : null, t.comments != null ? `комменты ${t.comments}` : null, t.date].filter(Boolean).join(", ");
    return `ВЕТКА #${i + 1}${m ? ` (${m})` : ""}:\n${fmtThread(t)}`;
  }).join("\n\n");

let user;
if (mode === "fix") {
  // ПРОМПТ 3 — почему ветка не получила охватов
  user =
    `Вот ветка, которая НЕ залетела:\n${fmtThread(data)}\n\n` +
    `Разбери, какой сигнал она даёт алгоритму. Найди КОНКРЕТНЫЙ твит, где читатель теряет желание реагировать, и объясни почему. ` +
    `Затем перепиши ХУК (1-й твит) и ФИНАЛ (последний твит) так, чтобы они провоцировали лайк/коммент в первый час. ` +
    `Структура ответа: 1) сигнал алгоритму; 2) где теряется реакция; 3) новый хук; 4) новый финал.`;
} else if (mode === "patterns") {
  // ПРОМПТ 5 — паттерны веток, которые алгоритм разгоняет
  if (!Array.isArray(data) || data.length < 2) { console.error("нужен массив из ≥2 веток"); process.exit(1); }
  user =
    `Вот ветки, которые набрали больше всего охватов:\n\n${fmtList(data)}\n\n` +
    `Найди ТРИ общих элемента. Объясни, почему алгоритм Threads их разгоняет. ` +
    `Дай шаблон, как повторить эти три элемента в ЛЮБОЙ нише FoodGenius (похудение/фитнес/семья/экономия).`;
} else if (mode === "reach") {
  // ПРОМПТ 6 — восстановить охваты
  if (!Array.isArray(data) || data.length < 2) { console.error("нужен массив веток с охватами (reach)"); process.exit(1); }
  user =
    `Вот мои последние ветки и их охваты:\n\n${fmtList(data)}\n\n` +
    `Разбери, ЧТО изменилось от ранних к последним. Найди, где именно потерян алгоритм (хук, сохранение, автономность, финал-вопрос, тема, частота). ` +
    `Дай ТРИ конкретных действия на следующую ветку — каждое выполнимое сразу.`;
} else {
  console.error("режим должен быть fix|patterns|reach");
  process.exit(1);
}

try {
  const out = await chat(SYS, user, 1500);
  console.log(out.trim());
} catch (e) {
  console.error("анализ не удался:", String(e).slice(0, 180));
  process.exit(1);
}

// Библиотека ЦА/площадок: загружает config/audience.json и собирает инструкции для генерации
// под конкретную (нишу × площадку). Используется генератором, критиком и подписями.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CFG = JSON.parse(readFileSync(join(root, "config", "audience.json"), "utf8"));

export const niches = () => CFG.niches;
export const platforms = () => CFG.platforms;
export const getNiche = (id) => CFG.niches.find((n) => n.id === id) || CFG.niches[0];
export const getPlatform = (id) => CFG.platforms[id] || CFG.platforms.youtube;
export const accentFor = (id) => getNiche(id).accent;

// Текстовый бриф для системного промпта LLM: ниша (боль/угол) + тон/хук/длина площадки.
export function systemBrief(nicheId, platformId) {
  const n = getNiche(nicheId);
  const p = getPlatform(platformId);
  const len = p.length_sec && p.length_sec[1] ? `${p.length_sec[0]}-${p.length_sec[1]} сек` : "текст";
  return (
    `НИША «${n.name}» (${n.audience}). Боли: ${n.pains.join("; ")}. ` +
    `Угол продукта: ${n.product_angle}. Примеры хуков ниши: ${(n.hook_examples || []).join(" / ")}. ` +
    `ПЛОЩАДКА ${p.name}: тон — ${p.tone}. Хук — ${p.hook_rule}. Длина — ${len}. ` +
    `ПУТЬ В БОТА на этой площадке: ${ctaPath(platformId)} — скажи это в речи/тексте (НЕ в коротком экранном призыве; в подпись путь добавят отдельно). ` +
    `Подбирай тон и хук СТРОГО под эту площадку и эту нишу — на разных площадках они РАЗНЫЕ.`
  );
}

// Где на площадке лежит кликабельная ссылка на бота (для устного/текстового призыва).
export const ctaPath = (platformId) => getPlatform(platformId).cta_path || "ссылка в профиле";

// Короткая подпись-указатель для экранного CTA в ролике (sound-off зрители).
export function ctaHintScreen(platformId) {
  const id = String(platformId || "").toLowerCase();
  if (id === "instagram" || id === "tiktok") return "ссылка в шапке профиля ☝";
  if (id === "youtube") return "ссылка в описании ↓";
  if (id === "threads") return "ссылка в посте ↓";
  return "бесплатно, в Telegram";
}

// Конфиг подписи под площадку (тон, хэштеги, лимит).
export function captionConfig(platformId) {
  const p = getPlatform(platformId);
  return { rule: p.caption_rule, base: p.hashtags_base || [], max: p.hashtags_max || 5, name: p.name };
}

// Правило хука площадки — для критика.
export const hookRule = (platformId) => getPlatform(platformId).hook_rule;

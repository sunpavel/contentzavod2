import React, { useState, useEffect } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  delayRender,
  continueRender,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { C, fontFamily, fitSize, loadAllFonts, Watermark } from "./brand";

export const CREATOR_FPS = 30;
export const CREATOR_DURATION = 438; // ~14.6s

// Формат «креатор/блогер»: ИИ-персонаж рассказывает (фейскам), на экране — web view приложения,
// внизу — крупные субтитры (то, что «говорит» персонаж). Тренд UGC «реакция/объяснение поверх записи».
const CLIP: Record<string, string> = {
  onboarding: "clip_onboarding.mp4",
  menu: "clip_menu_real.mp4",
  plan: "clip_plan.mp4",
};
export type CreatorBeat = { say: string; clip?: keyof typeof CLIP };
export type CreatorSpec = {
  hookLine?: string;           // первая фраза «в камеру»
  beats?: CreatorBeat[];       // что говорит + какой экран приложения показать (3 бита)
  ctaTitle?: string;
  accent?: string;
  music?: boolean;
};

export const CREATOR_DEFAULT: CreatorSpec = {
  hookLine: "Я перестала думать,\nчто готовить",
  beats: [
    { say: "Просто пишу боту — и он за 10 секунд собирает план питания на неделю", clip: "onboarding" },
    { say: "Каждый день новое блюдо под мои калории. Больше никакой «опять гречки»", clip: "menu" },
    { say: "А ещё сразу готовый список покупок — беру телефон и иду в магазин", clip: "plan" },
  ],
  ctaTitle: "Попробуй — это\nбесплатно",
  accent: "#14C7C0",
};

// ── ИИ-персонаж (маскот): тёплый бирюзовый «колобок-повар», моргает и «говорит» ──
const AiMascot: React.FC<{ talking?: boolean; size?: number }> = ({ talking = true, size = 200 }) => {
  const frame = useCurrentFrame();
  // моргание раз в ~2.7с
  const blinkPhase = frame % 80;
  const eyeScaleY = blinkPhase < 4 ? interpolate(blinkPhase, [0, 2, 4], [1, 0.1, 1]) : 1;
  // рот «говорит»
  const mouthH = talking ? 10 + (Math.sin(frame * 0.9) * 0.5 + 0.5) * 26 : 8;
  const bob = Math.sin(frame * 0.12) * (size * 0.012);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ transform: `translateY(${bob}px)` }}>
      <defs>
        <radialGradient id="face" cx="42%" cy="34%" r="75%">
          <stop offset="0%" stopColor="#2BE3DC" />
          <stop offset="60%" stopColor="#14C7C0" />
          <stop offset="100%" stopColor="#0E8F8A" />
        </radialGradient>
      </defs>
      {/* колпак повара */}
      <g>
        <ellipse cx="100" cy="34" rx="46" ry="26" fill="#FFFFFF" />
        <circle cx="68" cy="36" r="20" fill="#FFFFFF" />
        <circle cx="132" cy="36" r="20" fill="#FFFFFF" />
        <rect x="64" y="44" width="72" height="18" rx="6" fill="#EDEDED" />
      </g>
      {/* лицо */}
      <circle cx="100" cy="116" r="66" fill="url(#face)" />
      {/* щёки */}
      <circle cx="64" cy="128" r="11" fill="#0E8F8A" opacity="0.45" />
      <circle cx="136" cy="128" r="11" fill="#0E8F8A" opacity="0.45" />
      {/* глаза */}
      <g fill="#0B2B2A">
        <ellipse cx="78" cy="106" rx="9" ry={11 * eyeScaleY} />
        <ellipse cx="122" cy="106" rx="9" ry={11 * eyeScaleY} />
      </g>
      <circle cx="81" cy="102" r="3" fill="#EAFFFE" />
      <circle cx="125" cy="102" r="3" fill="#EAFFFE" />
      {/* рот (говорит) */}
      <ellipse cx="100" cy={140} rx="20" ry={mouthH / 2} fill="#08302F" />
      <ellipse cx="100" cy={140 + mouthH / 4} rx="11" ry={mouthH / 3.5} fill="#FF6F6B" />
      {/* AI-искра */}
      <g transform="translate(150 70)" fill="#FFD64A">
        <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" />
      </g>
    </svg>
  );
};

// Фейскам-карточка персонажа (как у блогеров в углу)
const FaceCam: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 16, stiffness: 110 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 44,
        bottom: 56,
        width: 250,
        height: 250,
        borderRadius: 32,
        background: "linear-gradient(160deg,#101820,#1c2b2b)",
        border: `4px solid ${accent}`,
        boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px) scale(${interpolate(p, [0, 1], [0.85, 1])})`,
      }}
    >
      <AiMascot size={190} />
      <div style={{ position: "absolute", top: 12, right: 14, display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 13, height: 13, borderRadius: 8, background: "#FF4B4B", boxShadow: "0 0 12px #FF4B4B" }} />
        <div style={{ fontFamily, color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>AI</div>
      </div>
    </div>
  );
};

// Телефон с web view приложения (как «экран», который показывает блогер)
const Phone: React.FC<{ src: string; w?: number; top?: number }> = ({ src, w = 560, top = 150 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const h = Math.round(w / (1080 / 2338));
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: "50%",
        width: w + 22,
        height: h + 22,
        marginLeft: -(w + 22) / 2,
        background: "#0a0a0f",
        borderRadius: 48,
        padding: 11,
        border: "2px solid rgba(255,255,255,0.08)",
        boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [80, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
      }}
    >
      <div style={{ width: w, height: h, borderRadius: 38, overflow: "hidden", background: "#0a0a0f" }}>
        <OffthreadVideo
          src={src}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transformOrigin: "50% 14%",
            transform: `scale(${interpolate(frame, [0, 120], [1.0, 1.06], { extrapolateRight: "clamp" })})`,
          }}
        />
      </div>
    </div>
  );
};

// Субтитры «речи» — слова всплывают по очереди (karaoke-style), с акцентом на ключевых
const Subtitle: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const words = (text || "").split(/\s+/).filter(Boolean);
  const per = 3.0; // кадров на слово (появление)
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 360,
        padding: "0 70px",
        textAlign: "center",
        fontFamily,
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "rgba(8,10,14,0.62)",
          borderRadius: 28,
          padding: "22px 30px",
          lineHeight: 1.22,
        }}
      >
        {words.map((w, i) => {
          const appear = interpolate(frame, [i * per, i * per + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isKey = w.length >= 7 || /\d/.test(w);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                margin: "0 7px",
                opacity: appear,
                transform: `translateY(${interpolate(appear, [0, 1], [14, 0])}px)`,
                color: isKey ? accent : C.white,
                fontSize: 52,
                fontWeight: 900,
                textShadow: "0 3px 16px rgba(0,0,0,0.6)",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Intro: React.FC<{ line: string; accent: string }> = ({ line, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 150 } });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 38%, #143a39 0%, #0c0c12 70%)", justifyContent: "center", alignItems: "center", fontFamily }}>
      <div style={{ transform: `scale(${interpolate(p, [0, 1], [0.8, 1])})`, opacity: p, marginBottom: 28 }}>
        <AiMascot size={300} />
      </div>
      <div
        style={{
          opacity: interpolate(frame, [6, 16], [0, 1], { extrapolateRight: "clamp" }),
          color: C.white,
          fontSize: fitSize(line.replace(/\n/g, " "), 92),
          fontWeight: 900,
          textAlign: "center",
          whiteSpace: "pre-line",
          lineHeight: 1.12,
          padding: "0 50px",
          textShadow: "0 6px 30px rgba(0,0,0,0.5)",
        }}
      >
        {line}
      </div>
      <div style={{ opacity: interpolate(frame, [14, 24], [0, 0.9], { extrapolateRight: "clamp" }), color: accent, fontSize: 30, fontWeight: 800, letterSpacing: 3, marginTop: 22 }}>
        РЕАЛЬНЫЙ ОПЫТ
      </div>
    </AbsoluteFill>
  );
};

const Beat: React.FC<{ beat: CreatorBeat; accent: string }> = ({ beat, accent }) => {
  const src = staticFile(CLIP[beat.clip || "menu"] || CLIP.menu);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 22%, #11302f 0%, #08080d 64%)", fontFamily }}>
      <Phone src={src} />
      <Subtitle text={beat.say} accent={accent} />
      <FaceCam accent={accent} />
    </AbsoluteFill>
  );
};

const Cta: React.FC<{ title: string; accent: string }> = ({ title, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 200 } });
  const pill = spring({ frame: frame - 12, fps, config: { damping: 12, stiffness: 130 } });
  const pulse = 1 + Math.sin(frame * 0.16) * 0.03;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg,#0E8F8A,#14C7C0)", justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily }}>
      <div style={{ opacity: t, transform: `scale(${interpolate(t, [0, 1], [0.8, 1])})`, marginBottom: 26 }}>
        <AiMascot size={230} />
      </div>
      <div style={{ opacity: t, transform: `translateY(${interpolate(t, [0, 1], [30, 0])}px)`, color: C.white, fontSize: 86, fontWeight: 900, lineHeight: 1.16, textAlign: "center", whiteSpace: "pre-line", marginBottom: 48, padding: "0 40px", textShadow: "0 6px 24px rgba(0,0,0,0.25)" }}>
        {title}
      </div>
      <div style={{ transform: `scale(${pill * pulse})`, background: C.white, color: "#0E8F8A", fontSize: 54, fontWeight: 900, padding: "26px 52px", borderRadius: 60, boxShadow: "0 18px 50px rgba(0,0,0,0.3)" }}>
        t.me/foodgenius_ai_bot
      </div>
      <div style={{ opacity: pill, color: C.white, fontSize: 42, fontWeight: 700, marginTop: 28 }}>бесплатно, в Telegram</div>
    </AbsoluteFill>
  );
};

const fadeT = (d = 8) => ({ presentation: fade(), timing: linearTiming({ durationInFrames: d }) });

export const CreatorReel: React.FC<CreatorSpec> = ({
  hookLine = CREATOR_DEFAULT.hookLine,
  beats = CREATOR_DEFAULT.beats,
  ctaTitle = CREATOR_DEFAULT.ctaTitle,
  accent = CREATOR_DEFAULT.accent,
  music = false,
}) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loadAllFonts().then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);

  const b = (beats && beats.length ? beats : CREATOR_DEFAULT.beats)!.slice(0, 3);
  while (b.length < 3) b.push(CREATOR_DEFAULT.beats![b.length]);
  const durs = [105, 115, 105];

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={70}>
          <Intro line={hookLine!} accent={accent!} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(8)} />

        {b.flatMap((beat, i) => [
          <TransitionSeries.Sequence key={`b${i}`} durationInFrames={durs[i]}>
            <Beat beat={beat} accent={accent!} />
          </TransitionSeries.Sequence>,
          <TransitionSeries.Transition key={`t${i}`} {...fadeT(8)} />,
        ])}

        <TransitionSeries.Sequence durationInFrames={75}>
          <Cta title={ctaTitle!} accent={accent!} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Watermark />
      {music && <Audio src={staticFile("music.mp3")} volume={0.4} loop />}
    </AbsoluteFill>
  );
};

import React, { useState, useEffect } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
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
import { slide } from "@remotion/transitions/slide";

export const DEMO_FPS = 30;
export const DEMO_DURATION = 494; // ~16.5s (с учётом перекрытий)

// Хук задаётся пропсом — так один компонент рендерит разные варианты боли.
export type HookCard = { label: string; line: string; size?: number };
export const GRECHKA_HOOK: HookCard[] = [
  { label: "Понедельник", line: "Гречка.", size: 150 },
  { label: "Среда", line: "Опять гречка.", size: 112 },
];

// Полная «спека» ролика — её готовит ИИ-сценарист из брифа по трендовому видео:
// хук + месседж (подписи) + выгоды + CTA + акцент-стиль. Один движок, разные ролики.
export type ReelSpec = {
  hook?: HookCard[];
  capOnboarding?: string;
  capMenu?: string;
  benefit?: string[];
  ctaTitle?: string;
  accent?: string;
};

const MONT = "Montserrat";
const DEJA = "DejaVuLocal";
const fontFamily = `${MONT}, ${DEJA}, sans-serif`;
const CYR = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116";
const LAT =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

const loadAllFonts = () => {
  const faces: FontFace[] = [];
  for (const w of ["700", "800", "900"]) {
    faces.push(new FontFace(MONT, `url(${staticFile(`fonts/montserrat-cyrillic-${w}-normal.woff2`)})`, { weight: w, unicodeRange: CYR }));
    faces.push(new FontFace(MONT, `url(${staticFile(`fonts/montserrat-latin-${w}-normal.woff2`)})`, { weight: w, unicodeRange: LAT }));
  }
  faces.push(new FontFace(DEJA, `url(${staticFile("fonts/DejaVuSans-Bold.ttf")})`, { weight: "100 900" }));
  return Promise.all(faces.map((f) => f.load().then((l) => document.fonts.add(l))));
};

const C = {
  dark: "#15151A",
  muted: "#23232B",
  red: "#E23B30",
  green: "#16A35C",
  white: "#F5F5F5",
  sub: "#9A9AA3",
};
const HANDLE = "@foodgenius_ai_bot";
const center: React.CSSProperties = { fontFamily, justifyContent: "center", alignItems: "center", textAlign: "center" };

const Pain: React.FC<{ label: string; line: string; size?: number }> = ({ label, line, size = 150 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelP = spring({ frame, fps, config: { damping: 200 } });
  const lineP = spring({ frame: frame - 6, fps, config: { damping: 11, stiffness: 150 } });
  return (
    <AbsoluteFill style={{ ...center, backgroundColor: C.muted }}>
      <div style={{ opacity: labelP, transform: `translateY(${interpolate(labelP, [0, 1], [-34, 0])}px)`, color: C.sub, fontSize: 48, fontWeight: 700, letterSpacing: 5, marginBottom: 28, maxWidth: 980, padding: "0 40px" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ opacity: lineP, transform: `scale(${interpolate(lineP, [0, 1], [0.55, 1])})`, color: C.white, fontSize: size, fontWeight: 900, maxWidth: 1000, lineHeight: 1.05, padding: "0 30px" }}>
        {line}
      </div>
    </AbsoluteFill>
  );
};

const Nadoelo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 9, stiffness: 130, mass: 0.8 } });
  const shake = frame > 18 ? Math.sin(frame * 1.3) * interpolate(frame, [18, 40], [10, 0], { extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ ...center, backgroundColor: C.red }}>
      <div style={{ transform: `scale(${s}) translateX(${shake}px)`, color: C.white, fontSize: 190, fontWeight: 900 }}>НАДОЕЛО?</div>
    </AbsoluteFill>
  );
};

// Телефон с реальным видео приложения
const PhoneVideo: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const float = Math.sin(frame * 0.05) * 6;
  const screenW = 720;
  const screenH = Math.round(screenW / (1080 / 2338)); // ~1559, совпадает с аспектом клипа
  return (
    <div
      style={{
        position: "absolute",
        top: 250,
        left: "50%",
        width: screenW + 24,
        height: screenH + 24,
        marginLeft: -(screenW + 24) / 2,
        background: "#0a0a0f",
        borderRadius: 56,
        padding: 12,
        border: "2px solid rgba(255,255,255,0.08)",
        boxShadow: "0 44px 110px rgba(0,0,0,0.55)",
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [140, float])}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
      }}
    >
      <div style={{ width: screenW, height: screenH, borderRadius: 44, overflow: "hidden", background: "#0a0a0f" }}>
        <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </div>
  );
};

const DemoScene: React.FC<{ src: string; caption: string }> = ({ src, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const capP = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ fontFamily, background: "radial-gradient(circle at 50% 26%, #11331f 0%, #0a0a0f 62%)" }}>
      <div
        style={{
          position: "absolute",
          top: 110,
          width: "100%",
          textAlign: "center",
          color: C.white,
          fontSize: 56,
          fontWeight: 800,
          padding: "0 40px",
          opacity: capP,
          transform: `translateY(${interpolate(capP, [0, 1], [-24, 0])}px)`,
        }}
      >
        {caption}
      </div>
      <PhoneVideo src={src} />
    </AbsoluteFill>
  );
};

// Бит «ценность»: строки поп-ином, последняя — акцентом (месседж из спеки)
const Benefit: React.FC<{ lines: string[]; accent: string }> = ({ lines, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ ...center, background: "radial-gradient(circle at 50% 30%, #11331f 0%, #0a0a0f 62%)", flexDirection: "column" }}>
      {lines.map((t, i) => {
        const last = i === lines.length - 1;
        const p = spring({ frame: frame - i * 11, fps, config: { damping: 13, stiffness: 140 } });
        return (
          <div
            key={i}
            style={{
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [28, 0])}px) scale(${interpolate(p, [0, 1], [0.8, 1])})`,
              color: last ? accent : C.white,
              fontSize: last ? 92 : 72,
              fontWeight: 900,
              margin: "14px 0",
              maxWidth: 1000,
              padding: "0 40px",
            }}
          >
            {t}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Cta: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 200 } });
  const pill = spring({ frame: frame - 12, fps, config: { damping: 12, stiffness: 130 } });
  const pulse = 1 + Math.sin(frame * 0.16) * 0.03;
  return (
    <AbsoluteFill style={{ ...center, backgroundColor: C.green, flexDirection: "column" }}>
      <div style={{ opacity: t, transform: `translateY(${interpolate(t, [0, 1], [30, 0])}px)`, color: C.white, fontSize: 84, fontWeight: 900, lineHeight: 1.18, marginBottom: 60, whiteSpace: "pre-line", padding: "0 40px" }}>
        {title}
      </div>
      <div style={{ transform: `scale(${pill * pulse})`, background: C.white, color: C.green, fontSize: 58, fontWeight: 900, padding: "26px 56px", borderRadius: 60, boxShadow: "0 18px 50px rgba(0,0,0,0.25)" }}>
        {HANDLE}
      </div>
      <div style={{ opacity: pill, color: C.white, fontSize: 42, fontWeight: 600, marginTop: 30 }}>бесплатно, в Telegram</div>
    </AbsoluteFill>
  );
};

const fadeT = (d = 8) => ({ presentation: fade(), timing: linearTiming({ durationInFrames: d }) });

export const DemoReel: React.FC<ReelSpec> = ({
  hook = GRECHKA_HOOK,
  capOnboarding = "Настрой под себя — 30 секунд",
  capMenu = "Меню на неделю + рецепты",
  benefit = ["Готовый план под цель", "Считает калории и КБЖУ", "+ список покупок"],
  ctaTitle = "Хочешь такой же\nплан питания?",
  accent = "#34D399",
}) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loadAllFonts().then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);

  // Хук собираем из пропса: N карточек боли → слайд-удар в НАДОЕЛО
  const hookEls: React.ReactNode[] = [];
  hook.forEach((c, i) => {
    const last = i === hook.length - 1;
    hookEls.push(
      <TransitionSeries.Sequence key={`h${i}`} durationInFrames={last ? 32 : 24}>
        <Pain label={c.label} line={c.line} size={c.size} />
      </TransitionSeries.Sequence>
    );
    hookEls.push(
      last ? (
        <TransitionSeries.Transition key={`ht${i}`} presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 8 })} />
      ) : (
        <TransitionSeries.Transition key={`ht${i}`} {...fadeT(6)} />
      )
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <TransitionSeries>
        {hookEls}
        <TransitionSeries.Sequence durationInFrames={44}>
          <Nadoelo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(8)} />

        <TransitionSeries.Sequence durationInFrames={135}>
          <DemoScene src={staticFile("clip_onboarding.mp4")} caption={capOnboarding} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(8)} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <DemoScene src={staticFile("clip_menu_real.mp4")} caption={capMenu} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(8)} />

        <TransitionSeries.Sequence durationInFrames={85}>
          <Benefit lines={benefit} accent={accent} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(8)} />

        <TransitionSeries.Sequence durationInFrames={70}>
          <Cta title={ctaTitle} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

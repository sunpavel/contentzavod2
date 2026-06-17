import React, { useState, useEffect } from "react";
import {
  AbsoluteFill,
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

const MONT = "Montserrat";
const DEJA = "DejaVuLocal";
const fontFamily = `${MONT}, ${DEJA}, sans-serif`;

// unicode-range подсетов Google (чтобы кириллица/латиница тянулись из нужных файлов,
// а отсутствующие глифы — напр. ₽ — падали в DejaVu)
const CYR = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116";
const LAT =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

const loadAllFonts = () => {
  const faces: FontFace[] = [];
  for (const w of ["700", "800", "900"]) {
    faces.push(
      new FontFace(MONT, `url(${staticFile(`fonts/montserrat-cyrillic-${w}-normal.woff2`)})`, {
        weight: w,
        unicodeRange: CYR,
      })
    );
    faces.push(
      new FontFace(MONT, `url(${staticFile(`fonts/montserrat-latin-${w}-normal.woff2`)})`, {
        weight: w,
        unicodeRange: LAT,
      })
    );
  }
  faces.push(new FontFace(DEJA, `url(${staticFile("fonts/DejaVuSans-Bold.ttf")})`, { weight: "100 900" }));
  return Promise.all(faces.map((f) => f.load().then((l) => document.fonts.add(l))));
};

export const FPS = 30;
export const REEL_DURATION = 490; // ~16.3s (с учётом перекрытий переходов)

const C = {
  dark: "#15151A",
  muted: "#23232B",
  red: "#E23B30",
  green: "#16A35C",
  warm: "#F4A623",
  white: "#F5F5F5",
  ink: "#1B1B20",
  sub: "#9A9AA3",
};
const HANDLE = "@foodgenius_ai_bot";

const center: React.CSSProperties = {
  fontFamily,
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
};

// ── Сцена боли: день + слово ──
const Pain: React.FC<{ day: string; word: string; size?: number }> = ({
  day,
  word,
  size = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dayP = spring({ frame, fps, config: { damping: 200 } });
  const wordP = spring({ frame: frame - 6, fps, config: { damping: 11, stiffness: 150 } });
  return (
    <AbsoluteFill style={{ ...center, backgroundColor: C.muted }}>
      <div
        style={{
          opacity: dayP,
          transform: `translateY(${interpolate(dayP, [0, 1], [-34, 0])}px)`,
          color: C.sub,
          fontSize: 54,
          fontWeight: 700,
          letterSpacing: 6,
          marginBottom: 28,
        }}
      >
        {day.toUpperCase()}
      </div>
      <div
        style={{
          opacity: wordP,
          transform: `scale(${interpolate(wordP, [0, 1], [0.55, 1])})`,
          color: C.white,
          fontSize: size,
          fontWeight: 900,
          maxWidth: 1000,
          lineHeight: 1.05,
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

// ── НАДОЕЛО? с ударом и тряской ──
const Nadoelo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 9, stiffness: 130, mass: 0.8 } });
  const shake =
    frame > 18 ? Math.sin(frame * 1.3) * interpolate(frame, [18, 40], [10, 0], { extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ ...center, backgroundColor: C.red }}>
      <div
        style={{
          transform: `scale(${s}) translateX(${shake}px)`,
          color: C.white,
          fontSize: 190,
          fontWeight: 900,
        }}
      >
        НАДОЕЛО?
      </div>
    </AbsoluteFill>
  );
};

// ── Телефон с меню (постадийное появление) ──
const DISHES: [string, string][] = [
  ["Паста с курицей", "15 мин · 180 ₽"],
  ["Боул с нутом", "12 мин · 140 ₽"],
  ["Том-ям", "20 мин · 260 ₽"],
  ["Шакшука", "10 мин · 120 ₽"],
  ["Лосось терияки", "18 мин · 290 ₽"],
  ["Грибное ризотто", "22 мин · 170 ₽"],
];

const Phone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleP = spring({ frame, fps, config: { damping: 200 } });
  const phoneP = spring({ frame: frame - 8, fps, config: { damping: 15, stiffness: 110 } });
  const float = Math.sin(frame * 0.06) * 8;
  return (
    <AbsoluteFill style={{ ...center, backgroundColor: C.green }}>
      <div
        style={{
          position: "absolute",
          top: 220,
          width: "100%",
          color: C.white,
          fontSize: 52,
          fontWeight: 800,
          opacity: titleP,
          transform: `translateY(${interpolate(titleP, [0, 1], [-22, 0])}px)`,
        }}
      >
        Открываешь — и вот меню:
      </div>

      <div
        style={{
          marginTop: 150,
          width: 620,
          background: C.white,
          borderRadius: 52,
          padding: "44px 0 30px",
          boxShadow: "0 36px 90px rgba(0,0,0,0.28)",
          opacity: phoneP,
          transform: `translateY(${interpolate(phoneP, [0, 1], [140, float])}px) scale(${interpolate(
            phoneP,
            [0, 1],
            [0.9, 1]
          )})`,
        }}
      >
        <div style={{ padding: "0 46px 22px", textAlign: "left" }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: C.ink }}>FoodGenius</div>
          <div style={{ fontSize: 34, fontWeight: 700, color: C.green }}>Меню на неделю</div>
        </div>
        <div style={{ height: 2, background: "#ECECEC", margin: "0 46px 10px" }} />
        {DISHES.map((d, i) => {
          const rp = spring({ frame: frame - 22 - i * 7, fps, config: { damping: 16, stiffness: 130 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
                padding: "16px 46px",
                opacity: rp,
                transform: `translateX(${interpolate(rp, [0, 1], [44, 0])}px)`,
                textAlign: "left",
              }}
            >
              <div style={{ width: 60, height: 60, borderRadius: 20, background: "#D6ECDD", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 42, fontWeight: 800, color: C.ink }}>{d[0]}</div>
                <div style={{ fontSize: 28, color: "#A0A0A6" }}>{d[1]}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Выгода: три строки поп-ином ──
const Benefit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = ["Готовые рецепты", "15 минут", "≈ 150 ₽ порция"];
  return (
    <AbsoluteFill style={{ ...center, backgroundColor: C.green, flexDirection: "column" }}>
      {lines.map((t, i) => {
        const p = spring({ frame: frame - i * 11, fps, config: { damping: 12, stiffness: 140 } });
        const big = i > 0;
        return (
          <div
            key={i}
            style={{
              opacity: p,
              transform: `scale(${interpolate(p, [0, 1], [0.65, 1])})`,
              color: C.white,
              fontSize: big ? 112 : 66,
              fontWeight: 900,
              margin: "12px 0",
            }}
          >
            {t}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── Сохрани ──
const Save: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const pulse = 1 + Math.sin(frame * 0.18) * 0.04;
  return (
    <AbsoluteFill style={{ ...center, backgroundColor: C.dark, flexDirection: "column" }}>
      <div style={{ transform: `scale(${p * pulse})`, marginBottom: 44 }}>
        <svg width="120" height="160" viewBox="0 0 120 160">
          <path d="M10 4 H110 V158 L60 118 L10 158 Z" fill={C.warm} />
        </svg>
      </div>
      <div
        style={{
          opacity: p,
          color: C.white,
          fontSize: 92,
          fontWeight: 900,
          lineHeight: 1.15,
        }}
      >
        Сохрани,
        <br />
        чтобы не есть
        <br />
        одно и то же
      </div>
    </AbsoluteFill>
  );
};

// ── CTA ──
const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 200 } });
  const pill = spring({ frame: frame - 12, fps, config: { damping: 12, stiffness: 130 } });
  const pulse = 1 + Math.sin(frame * 0.16) * 0.03;
  return (
    <AbsoluteFill style={{ ...center, backgroundColor: C.green, flexDirection: "column" }}>
      <div
        style={{
          opacity: t,
          transform: `translateY(${interpolate(t, [0, 1], [30, 0])}px)`,
          color: C.white,
          fontSize: 88,
          fontWeight: 900,
          lineHeight: 1.18,
          marginBottom: 64,
        }}
      >
        AI соберёт твой
        <br />
        план питания
        <br />
        и список покупок
      </div>
      <div
        style={{
          transform: `scale(${pill * pulse})`,
          background: C.white,
          color: C.green,
          fontSize: 58,
          fontWeight: 900,
          padding: "26px 56px",
          borderRadius: 60,
          boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
        }}
      >
        {HANDLE}
      </div>
      <div style={{ opacity: pill, color: C.white, fontSize: 42, fontWeight: 600, marginTop: 30 }}>
        бесплатно, в Telegram
      </div>
    </AbsoluteFill>
  );
};

const fadeT = (d = 9) => ({ presentation: fade(), timing: linearTiming({ durationInFrames: d }) });

export const GrechkaReel: React.FC = () => {
  const [handle] = useState(() => delayRender("load-fonts"));
  useEffect(() => {
    loadAllFonts()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);

  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={32}>
          <Pain day="Понедельник" word="Гречка." />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(7)} />

        <TransitionSeries.Sequence durationInFrames={32}>
          <Pain day="Вторник" word="Гречка." />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(7)} />

        <TransitionSeries.Sequence durationInFrames={42}>
          <Pain day="Среда" word="Опять гречка." size={112} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 8 })}
        />

        <TransitionSeries.Sequence durationInFrames={50}>
          <Nadoelo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(9)} />

        <TransitionSeries.Sequence durationInFrames={155}>
          <Phone />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(9)} />

        <TransitionSeries.Sequence durationInFrames={95}>
          <Benefit />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(9)} />

        <TransitionSeries.Sequence durationInFrames={72}>
          <Save />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...fadeT(9)} />

        <TransitionSeries.Sequence durationInFrames={70}>
          <Cta />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

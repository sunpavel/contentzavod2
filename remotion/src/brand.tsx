// Общие бренд-элементы для всех форматов роликов (шрифты, цвета, ссылка, вотермарка).
import React from "react";
import { AbsoluteFill, staticFile } from "remotion";

export const MONT = "Montserrat";
export const DEJA = "DejaVuLocal";
export const fontFamily = `${MONT}, ${DEJA}, sans-serif`;
const CYR = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116";
const LAT =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

export const loadAllFonts = () => {
  const faces: FontFace[] = [];
  for (const w of ["700", "800", "900"]) {
    faces.push(new FontFace(MONT, `url(${staticFile(`fonts/montserrat-cyrillic-${w}-normal.woff2`)})`, { weight: w, unicodeRange: CYR }));
    faces.push(new FontFace(MONT, `url(${staticFile(`fonts/montserrat-latin-${w}-normal.woff2`)})`, { weight: w, unicodeRange: LAT }));
  }
  faces.push(new FontFace(DEJA, `url(${staticFile("fonts/DejaVuSans-Bold.ttf")})`, { weight: "100 900" }));
  return Promise.all(faces.map((f) => f.load().then((l) => (document.fonts as any).add(l))));
};

export const C = {
  dark: "#15151A",
  muted: "#23232B",
  red: "#E23B30",
  green: "#16A35C",
  teal: "#14C7C0",
  white: "#F5F5F5",
  sub: "#9A9AA3",
};

export const LINK = "t.me/foodgenius_ai_bot"; // ссылка на бота — всегда в кадре
export const BOT_URL = "https://t.me/foodgenius_ai_bot";

// Постоянная вотермарка бренда (узнаваемость + защита при репосте)
export const Watermark: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        top: 46,
        left: 54,
        fontFamily,
        color: "rgba(255,255,255,0.5)",
        fontSize: 33,
        fontWeight: 800,
        letterSpacing: 0.5,
        textShadow: "0 2px 12px rgba(0,0,0,0.5)",
      }}
    >
      {LINK}
    </div>
  </AbsoluteFill>
);

// Авто-подгон размера длинной строки (≈ в 2 строки)
export const fitSize = (text: string, size: number, maxW = 980) => {
  const len = [...(text || "")].length || 1;
  const est = len * 0.6 * size;
  const maxTwoLines = maxW * 1.9;
  return est > maxTwoLines ? Math.floor(maxTwoLines / (len * 0.6)) : size;
};

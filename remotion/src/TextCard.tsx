// Текстовая карточка для Instagram (там нельзя «чисто текст» — нужен визуал).
// Рендерится как STILL: npx remotion still TextCard out.png --props='{"card":"...","accent":"#14C7C0"}'
import React, { useState, useEffect } from "react";
import { AbsoluteFill, Img, staticFile, delayRender, continueRender } from "remotion";
import { C, fontFamily, fitSize, loadAllFonts, LINK } from "./brand";

export type TextCardSpec = { card?: string; accent?: string; tag?: string };
export const TEXTCARD_DEFAULT: TextCardSpec = {
  card: "Я больше не думаю,\nчто готовить",
  accent: "#14C7C0",
  tag: "AI план питания",
};

export const TextCard: React.FC<TextCardSpec> = ({
  card = TEXTCARD_DEFAULT.card,
  accent = TEXTCARD_DEFAULT.accent,
  tag = TEXTCARD_DEFAULT.tag,
}) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loadAllFonts().then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);

  const text = (card || "").replace(/\\n/g, "\n");
  const fs = fitSize(text.replace(/\n/g, " "), 118, 900);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 32%, #143a39 0%, #0b0b11 72%)", fontFamily }}>
      {/* верх: бренд */}
      <div style={{ position: "absolute", top: 64, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
        <Img src={staticFile("avatar.png")} style={{ width: 92, height: 92, borderRadius: 22 }} />
        <div style={{ textAlign: "left" }}>
          <div style={{ color: C.white, fontSize: 40, fontWeight: 900, lineHeight: 1 }}>FoodGenius</div>
          <div style={{ color: accent, fontSize: 28, fontWeight: 800, marginTop: 4 }}>{tag}</div>
        </div>
      </div>

      {/* центр: крючок */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            color: C.white,
            fontSize: fs,
            fontWeight: 900,
            textAlign: "center",
            whiteSpace: "pre-line",
            lineHeight: 1.1,
            padding: "0 70px",
            textShadow: "0 8px 36px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>

      {/* низ: ссылка-плашка */}
      <div style={{ position: "absolute", bottom: 74, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ background: accent, color: "#06201F", fontSize: 44, fontWeight: 900, padding: "20px 46px", borderRadius: 50, boxShadow: "0 14px 40px rgba(0,0,0,0.35)" }}>
          {LINK}
        </div>
      </div>
    </AbsoluteFill>
  );
};

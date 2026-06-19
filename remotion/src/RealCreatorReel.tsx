import React, { useState, useEffect } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Audio,
  Sequence,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  delayRender,
  continueRender,
} from "remotion";
import { C, fontFamily, fitSize, loadAllFonts, LINK } from "./brand";

export const REALCREATOR_FPS = 30;

// Формат «настоящий человек за столом рассказывает» (видео HeyGen со звуком) +
// запись приложения вставкой-перебивкой + CTA. Длина = длина видео человека + хвост CTA.
const APP_CLIPS = ["clip_onboarding.mp4", "clip_menu_real.mp4", "clip_plan.mp4"];

export type RealCreatorSpec = {
  avatarSrc?: string;    // видео человека (HeyGen), в remotion/public
  avatarFrames?: number; // длина этого видео в кадрах (ставит calculateMetadata)
  hook?: string;         // текст-хук на экране в первые ~2с (просмотр без звука)
  ctaTitle?: string;
  accent?: string;
};
export const REALCREATOR_DEFAULT: RealCreatorSpec = {
  avatarSrc: "avatar_talk.mp4",
  avatarFrames: 480,
  hook: "Надоело думать,\nчто приготовить?",
  ctaTitle: "Попробуй — это\nбесплатно",
  accent: "#14C7C0",
};

// Текст-хук на экране в первые секунды — удержание для просмотра без звука
const HookOverlay: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 13, stiffness: 150 } });
  const op = interpolate(frame, [0, 6, 50, 62], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame > 64) return null;
  return (
    <div style={{ position: "absolute", top: 150, left: 0, right: 0, padding: "0 60px", textAlign: "center", opacity: op }}>
      <div
        style={{
          display: "inline-block",
          background: "rgba(8,10,14,0.72)",
          borderRadius: 26,
          padding: "22px 30px",
          transform: `translateY(${interpolate(p, [0, 1], [-30, 0])}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
          borderBottom: `6px solid ${accent}`,
        }}
      >
        <div style={{ color: "#fff", fontSize: fitSize(text.replace(/\n/g, " "), 80, 920), fontWeight: 900, lineHeight: 1.12, whiteSpace: "pre-line", textShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>
          {text}
        </div>
      </div>
    </div>
  );
};

// Телефон-вставка с записью приложения (перебивка, пока человек говорит)
const AppInset: React.FC<{ avatarFrames: number; accent: string }> = ({ avatarFrames, accent }) => {
  const frame = useCurrentFrame();
  const start = Math.round(avatarFrames * 0.22);
  const end = Math.round(avatarFrames * 0.84);
  if (frame < start - 12 || frame > end + 12) return null;
  // какой из 3 экранов показываем
  const span = (end - start) / APP_CLIPS.length;
  const idx = Math.min(APP_CLIPS.length - 1, Math.max(0, Math.floor((frame - start) / span)));
  const enter = interpolate(frame, [start - 12, start + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [end - 6, end + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = Math.min(enter, exit);
  const w = 392, h = Math.round(w / (1080 / 2338));
  return (
    <div
      style={{
        position: "absolute",
        right: 40,
        bottom: 150,
        width: w + 16,
        height: h + 16,
        background: "#0a0a0f",
        borderRadius: 36,
        padding: 8,
        border: `3px solid ${accent}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        opacity: op,
        transform: `translateY(${interpolate(op, [0, 1], [40, 0])}px) scale(${interpolate(op, [0, 1], [0.9, 1])})`,
      }}
    >
      <div style={{ width: w, height: h, borderRadius: 28, overflow: "hidden", background: "#0a0a0f" }}>
        <OffthreadVideo src={staticFile(APP_CLIPS[idx])} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ position: "absolute", top: -14, left: 16, background: accent, color: "#06201F", fontFamily, fontSize: 22, fontWeight: 900, padding: "4px 14px", borderRadius: 20 }}>
        в приложении
      </div>
    </div>
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
      <Img src={staticFile("avatar.png")} style={{ width: 150, height: 150, borderRadius: 38, marginBottom: 30, opacity: t, transform: `scale(${interpolate(t, [0, 1], [0.7, 1])})` }} />
      <div style={{ opacity: t, transform: `translateY(${interpolate(t, [0, 1], [30, 0])}px)`, color: C.white, fontSize: 84, fontWeight: 900, lineHeight: 1.16, textAlign: "center", whiteSpace: "pre-line", marginBottom: 46, padding: "0 40px" }}>
        {title}
      </div>
      <div style={{ transform: `scale(${pill * pulse})`, background: C.white, color: "#0E8F8A", fontSize: 54, fontWeight: 900, padding: "26px 52px", borderRadius: 60, boxShadow: "0 18px 50px rgba(0,0,0,0.3)" }}>
        {LINK}
      </div>
      <div style={{ opacity: pill, color: C.white, fontSize: 42, fontWeight: 700, marginTop: 28 }}>бесплатно, в Telegram</div>
    </AbsoluteFill>
  );
};

export const RealCreatorReel: React.FC<RealCreatorSpec> = ({
  avatarSrc = REALCREATOR_DEFAULT.avatarSrc,
  avatarFrames = REALCREATOR_DEFAULT.avatarFrames,
  hook = REALCREATOR_DEFAULT.hook,
  ctaTitle = REALCREATOR_DEFAULT.ctaTitle,
  accent = REALCREATOR_DEFAULT.accent,
}) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    loadAllFonts().then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
  const af = avatarFrames!;
  const ctaFrames = 75;
  const total = af + ctaFrames;
  return (
    <AbsoluteFill style={{ backgroundColor: C.dark }}>
      {/* фоновая музыка — тихо под голос, с фейдами; на CTA чуть громче */}
      <Audio
        src={staticFile("music.wav")}
        loop
        volume={(f) =>
          interpolate(f, [0, 18, af - 6, af + 8, total - 24, total - 1], [0, 0.12, 0.12, 0.22, 0.22, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <Sequence durationInFrames={af}>
        <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 35%, #14201f 0%, #0a0a0f 70%)", overflow: "hidden" }}>
          <OffthreadVideo
            src={staticFile(avatarSrc!)}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(2.5)", transformOrigin: "50% 50%" }}
          />
          <AppInset avatarFrames={af} accent={accent!} />
          {hook ? <HookOverlay text={hook} accent={accent!} /> : null}
        </AbsoluteFill>
      </Sequence>
      <Sequence from={af - 10} durationInFrames={ctaFrames + 10}>
        <Cta title={ctaTitle!} accent={accent!} />
      </Sequence>
    </AbsoluteFill>
  );
};

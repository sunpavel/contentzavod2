import React from "react";
import { Composition, staticFile } from "remotion";
import { GrechkaReel, REEL_DURATION, FPS } from "./GrechkaReel";
import { DemoReel, DEMO_DURATION, DEMO_FPS, GRECHKA_HOOK } from "./DemoReel";
import { CreatorReel, CREATOR_DURATION, CREATOR_FPS, CREATOR_DEFAULT } from "./CreatorReel";
import { RealCreatorReel, REALCREATOR_FPS, REALCREATOR_DEFAULT } from "./RealCreatorReel";
import { TextCard, TEXTCARD_DEFAULT } from "./TextCard";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GrechkaReel"
        component={GrechkaReel}
        durationInFrames={REEL_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="DemoReel"
        component={DemoReel}
        durationInFrames={DEMO_DURATION}
        fps={DEMO_FPS}
        width={1080}
        height={1920}
        defaultProps={{ hook: GRECHKA_HOOK }}
      />
      <Composition
        id="CreatorReel"
        component={CreatorReel}
        durationInFrames={CREATOR_DURATION}
        fps={CREATOR_FPS}
        width={1080}
        height={1920}
        defaultProps={CREATOR_DEFAULT}
      />
      <Composition
        id="RealCreatorReel"
        component={RealCreatorReel}
        durationInFrames={574}
        fps={REALCREATOR_FPS}
        width={1080}
        height={1920}
        defaultProps={REALCREATOR_DEFAULT}
        calculateMetadata={async ({ props }) => {
          const fps = REALCREATOR_FPS;
          let af = props.avatarFrames;
          if (!af) {
            try { af = (await (await fetch(staticFile("avatar_talk.json"))).json()).frames; } catch {}
          }
          af = af || 499;
          return { durationInFrames: af + 75, fps, props: { ...props, avatarFrames: af } };
        }}
      />
      <Composition
        id="TextCard"
        component={TextCard}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={TEXTCARD_DEFAULT}
      />
    </>
  );
};

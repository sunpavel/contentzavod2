import React from "react";
import { Composition } from "remotion";
import { GrechkaReel, REEL_DURATION, FPS } from "./GrechkaReel";
import { DemoReel, DEMO_DURATION, DEMO_FPS } from "./DemoReel";

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
      />
    </>
  );
};

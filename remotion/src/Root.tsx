import React from "react";
import { Composition } from "remotion";
import { GrechkaReel, REEL_DURATION, FPS } from "./GrechkaReel";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="GrechkaReel"
      component={GrechkaReel}
      durationInFrames={REEL_DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};

"use client";

import { useReducer } from "react";

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";

export const FrameRateChecker = () => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const frameRate = useAnimationFrames(forceUpdate, true);

  return (
    <div className="absolute hljs top-0 left-0 p-2 font-geist-mono">
      {frameRate.current.toFixed(2)}
    </div>
  );
}

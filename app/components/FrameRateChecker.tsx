"use client";

import { useContext, useReducer } from "react";

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";
import { DebugContext } from "@/app/components/DebugContext";

const FrameRateDisplay = () => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const frameRate = useAnimationFrames(forceUpdate, true);

  return (
    <div className="sticky hljs top-0 left-0 p-2 font-geist-mono">
      {frameRate.current.toFixed(2)}
    </div>
  );
}

// Avoid requesting animation frames when not mounted
// Could do this in parent component, but that's the header which I want to be server rendered
export const FrameRateChecker = () => {
  const { debug } = useContext(DebugContext);

  return debug ? <FrameRateDisplay /> : null;
}

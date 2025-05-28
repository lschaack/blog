import { useEffect, useRef } from "react";
import { lerp } from "@/app/utils/lerp";

/**
 * Handles boilerplate for animating in an effect
 *
 * NOTE: callback should be memoized for performance
 */
export const useAnimationFrames = (callback: (delta: number) => void, enable = true) => {
  const fps = useRef(60);

  useEffect(() => {
    if (enable) {
      let frameId: number;
      let prevTime: number;

      const animate: FrameRequestCallback = (currTime: number) => {
        const delta = prevTime ? currTime - prevTime : 16.67; // assume 60fps
        const momentaryFps = 1000 / delta;
        // TODO: lerp isn't really a great lpf for this, just what I've got at hand
        fps.current = lerp(fps.current, momentaryFps, 0.5);

        callback(delta);

        prevTime = currTime;
        frameId = requestAnimationFrame(animate);
      }

      frameId = requestAnimationFrame(animate);

      return () => {
        if (frameId) cancelAnimationFrame(frameId);
      }
    }
  }, [callback, enable]);

  return fps;
}

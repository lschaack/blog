import { useEffect } from "react";

/**
 * Handles boilerplate for animating in an effect
 *
 * NOTE: callback should be memoized for performance
 */
export const useAnimationFrames = (callback: (delta: number) => void, enable = true) => {
  useEffect(() => {
    if (enable) {
      let frameId: number;
      let prevTime: number;

      const animate: FrameRequestCallback = (currTime: number) => {
        const delta = prevTime ? currTime - prevTime : 16.67; // assume 60fps

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
}

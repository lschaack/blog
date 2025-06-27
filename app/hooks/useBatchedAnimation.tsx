"use client";

import { createContext, FC, ReactNode, useContext, useEffect, useMemo } from "react";

import { AnimationCallback } from "@/app/hooks/useAnimationFrames";
import { lerp } from "@/app/utils/lerp";

type AnimationCallbackQueue = Set<AnimationCallback>;

// TODO: Replace old useAnimationFrames() hook pattern with this
class AnimationBatch {
  private callbacks: AnimationCallbackQueue;
  // NOTE: prevTime serves as a marker as to whether or not the animation is currently running
  private prevTime: number | undefined;
  private frameId: number;
  fps: number;

  static EXPECTED_FRAME_RATE_MS = 60;

  constructor() {
    this.callbacks = new Set();
    this.frameId = -1;
    this.fps = 60;
  }

  private deltaify = (callback: FrameRequestCallback) => {
    return (currTime: number) => {
      const delta = this.prevTime ? currTime - this.prevTime : AnimationBatch.EXPECTED_FRAME_RATE_MS;

      this.prevTime = currTime;

      callback(delta);
    }
  }

  private extractFrameRate = (callback: AnimationCallback) => {
    return (delta: number) => {
      const momentaryFps = 1000 / delta;

      // avoid getting stuck at Infinity when currTime === prevTime,
      // not sure why it happens but very rare
      if (momentaryFps < Infinity) this.fps = lerp(this.fps, momentaryFps, 0.05);

      callback(delta);
    }
  }

  private _runBatch = (currTime: number) => {
    for (const callback of this.callbacks) {
      callback(currTime);
    }
  }

  private start = () => {
    const runBatch = (
      this.deltaify(
        this.extractFrameRate(
          this._runBatch
        )
      )
    );

    const iterate = (currTime: number) => {
      if (this.callbacks.size) {
        runBatch(currTime);

        this.frameId = requestAnimationFrame(iterate);
      } else {
        this.prevTime = undefined;
      }
    }

    this.frameId = requestAnimationFrame(iterate);
  }

  add = (callback: AnimationCallback) => {
    this.callbacks.add(callback);

    if (!this.prevTime) this.start();
  }

  delete = (callback: AnimationCallback) => {
    this.callbacks.delete(callback);
  }

  cancel = () => {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.prevTime = undefined;
    }
  }
}

export const BatchedAnimationContext = createContext<AnimationBatch>(new AnimationBatch());

export const BatchedAnimationContextProvider: FC<{ children?: ReactNode }> = ({ children }) => {
  const batch = useMemo<AnimationBatch>(() => new AnimationBatch(), []);

  return (
    <BatchedAnimationContext.Provider value={batch}>
      {children}
    </BatchedAnimationContext.Provider>
  )
}

export const useBatchedAnimation = (callback: (delta: number) => void, enable = true) => {
  const batch = useContext(BatchedAnimationContext);

  useEffect(() => {
    if (enable) {
      batch.add(callback);

      return () => void batch.delete(callback);
    }
  }, [callback, enable, batch]);
}

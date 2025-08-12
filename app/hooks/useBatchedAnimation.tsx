"use client";

import { createContext, FC, ReactNode, useContext, useEffect, useState } from "react";

import { AnimationCallback } from "@/app/hooks/useAnimationFrames";
import { lerp } from "@/app/utils/lerp";

type AnimationCallbackQueue = Set<AnimationCallback>;

// TODO: Replace old useAnimationFrames() hook pattern with this
class AnimationBatch {
  private callbacks: AnimationCallbackQueue;
  private prevTime: number | undefined;
  private frameId: number;
  private running: boolean;
  fps: number;

  static EXPECTED_FRAME_RATE_MS = 1000 / 60;

  constructor() {
    this.callbacks = new Set();
    this.frameId = -1;
    this.running = false;
    this.fps = 60;
  }

  private runBatch = (currTime: number) => {
    const delta = this.prevTime ? currTime - this.prevTime : AnimationBatch.EXPECTED_FRAME_RATE_MS;

    this.prevTime = currTime;

    const momentaryFps = 1000 / delta;

    // avoid getting stuck at Infinity when currTime === prevTime,
    // not sure why it happens but very rare
    if (momentaryFps < Infinity) this.fps = lerp(this.fps, momentaryFps, 0.05);

    for (const callback of this.callbacks) {
      callback(delta);
    }
  }

  private start = () => {
    if (this.running) throw new Error('Attempted to start a running animation batch');

    this.running = true;

    const iterate = (currTime: number) => {
      if (this.callbacks.size) {
        this.runBatch(currTime);

        this.frameId = requestAnimationFrame(iterate);
      } else {
        this.stop();
      }
    }

    this.frameId = requestAnimationFrame(iterate);
  }

  resetDelta = () => {
    this.prevTime = undefined;
  }

  stop = () => {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.prevTime = undefined;
      this.running = false;
    }
  }

  resume = () => {
    if (!this.running && this.callbacks.size) this.start();
  }

  add = (callback: AnimationCallback) => {
    this.callbacks.add(callback);

    if (!this.running) this.start();
  }

  delete = (callback: AnimationCallback) => {
    this.callbacks.delete(callback);

    if (!this.callbacks.size && this.running) this.stop();
  }

  getSize = () => this.callbacks.size;
}

export const BatchedAnimationContext = createContext<AnimationBatch>(new AnimationBatch());

export const BatchedAnimationContextProvider: FC<{ children?: ReactNode }> = ({ children }) => {
  const [batch] = useState<AnimationBatch>(new AnimationBatch());

  useEffect(() => {
    document.addEventListener('visibilitychange', batch.resetDelta);

    return () => document.removeEventListener('visibilitychange', batch.resetDelta);
  }, [batch]);

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

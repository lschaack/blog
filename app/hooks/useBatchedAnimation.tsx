"use client";

import { createContext, FC, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";

type AnimationCallbackQueue = Set<(delta: number) => void>;
export const BatchedAnimationContext = createContext<AnimationCallbackQueue>(new Set());

export const BatchedAnimationContextProvider: FC<{ children?: ReactNode }> = ({ children }) => {
  const [queue] = useState<AnimationCallbackQueue>(new Set());

  const animate = useCallback((delta: number) => {
    for (const callback of queue) {
      callback(delta);
    }
  }, [queue]);

  // TODO: Enable/disable
  useAnimationFrames(animate);

  return (
    <BatchedAnimationContext.Provider value={queue}>
      {children}
    </BatchedAnimationContext.Provider>
  )
}

export const useBatchedAnimation = (callback: (delta: number) => void, enable = true) => {
  const queue = useContext(BatchedAnimationContext);

  useEffect(() => {
    if (enable) {
      queue.add(callback);

      return () => void queue.delete(callback);
    }
  }, [callback, enable, queue]);
}

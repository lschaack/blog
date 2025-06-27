"use client";

import { createContext, FC, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";

type AnimationCallbackQueue = Set<(delta: number) => void>;
export const BatchedAnimationContext = createContext<AnimationCallbackQueue>(new Set());

export const BatchedAnimationContextProvider: FC<{ children?: ReactNode }> = ({ children }) => {
  const [callbacks] = useState<AnimationCallbackQueue>(new Set());

  const animate = useCallback((delta: number) => {
    for (const callback of callbacks) {
      callback(delta);
    }
  }, [callbacks]);

  // TODO: Enable/disable
  useAnimationFrames(animate);

  return (
    <BatchedAnimationContext.Provider value={callbacks}>
      {children}
    </BatchedAnimationContext.Provider>
  )
}

export const useBatchedAnimation = (callback: (delta: number) => void, enable = true) => {
  const callbacks = useContext(BatchedAnimationContext);

  useEffect(() => {
    if (enable) {
      callbacks.add(callback);

      return () => void callbacks.delete(callback);
    }
  }, [callback, enable, callbacks]);
}

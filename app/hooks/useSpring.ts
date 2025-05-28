import { useCallback, useRef, useState } from "react";

import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";
import { getDecay } from "@/app/utils/physicsConsts";

export const useSpringValue = (initialVal: number, target: number, stiffness: number = 0.05) => {
  const [value, setValue] = useState(initialVal);
  const velocity = useRef(0);

  const update = useCallback((delta: number) => {
    setValue(prev => {
      const distance = target - prev;
      const force = distance * stiffness;

      velocity.current = velocity.current * getDecay(delta) + force;

      return prev + velocity.current;
    })
  }, [stiffness, target]);

  useAnimationFrames(update);

  return value;
}

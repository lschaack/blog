import { useCallback, useState } from 'react';

import { EasingStrategy } from '@/app/utils/easingFunctions';
import { EasingDirection, requestEasingFrames } from '@/app/utils/requestEasingFrames';
import throttle from "lodash/throttle";

export const useEaseTrigger = (
  duration: number,
  easingStrategy: EasingStrategy = 'easeInOut',
  delay = 0,
) => {
  const [easingFactor, setEasingFactor] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trigger = useCallback(throttle(() => {
    const fire = () => {
      setEasingFactor(0);
      requestEasingFrames(
        0,
        duration,
        EasingDirection.UP,
        setEasingFactor,
        easingStrategy
      );
    }

    if (delay) setTimeout(fire, delay);
    else fire();
  }, duration), [duration, easingStrategy]);

  return { easingFactor, trigger };
}


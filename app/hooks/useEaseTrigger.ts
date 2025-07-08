import { useCallback, useState } from 'react';

import { EasingStrategy } from '@/app/utils/easingFunctions';
import { EasingDirection, requestEasingFrames } from '@/app/utils/requestEasingFrames';
import throttle from "lodash/throttle";

export const useEaseTrigger = (
  duration: number,
  easingStrategy: EasingStrategy = 'easeInOut',
) => {
  const [easingFactor, setEasingFactor] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trigger = useCallback(throttle(() => {
    setEasingFactor(0);
    requestEasingFrames(
      0,
      duration,
      EasingDirection.UP,
      setEasingFactor,
      easingStrategy
    );
  }, duration), [duration, easingStrategy]);

  return { easingFactor, trigger };
}


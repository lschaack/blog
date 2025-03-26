import { useState } from 'react';

import { EasingStrategy } from '@/app/utils/easingFunctions';
import { EasingDirection, requestEasingFrames } from '@/app/utils/requestEasingFrames';

export const useEaseTrigger = (
  duration: number,
  easingStrategy: EasingStrategy = 'easeInOut',
) => {
  const [easingFactor, setEasingFactor] = useState(0);

  const trigger = () => {
    setEasingFactor(0);
    requestEasingFrames(
      0,
      duration,
      EasingDirection.UP,
      setEasingFactor,
      easingStrategy
    );
  }

  return { easingFactor, trigger };
}


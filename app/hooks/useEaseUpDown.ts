import {
  useEffect,
  useState
} from 'react';

import { EasingStrategy } from '@/app/utils/easingFunctions';
import { EasingDirection, requestEasingFrames } from '@/app/utils/requestEasingFrames';

export const useEaseUpDown = (
  duration: number,
  direction = EasingDirection.UP,
  easingStrategy: EasingStrategy = 'easeInOut'
) => {
  const [easingFactor, setEasingFactor] = useState(0);

  useEffect(
    () => requestEasingFrames(easingFactor, duration, direction, setEasingFactor, easingStrategy),
    // easingFactor needs to be tracked in state to fire rerenders for components using this hook,
    // but this effect should only really fire when direction changes (otherwise animation will be
    // continually stopped and restarted)
    [duration, direction] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return easingFactor;
}

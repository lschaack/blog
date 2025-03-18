import {
  useEffect,
  useState
} from 'react';

import {
  easeOutSine as _easeOutSine,
  inverseEaseOutSine as _inverseEaseOutSine,
  easeInOut as _easeInOut,
  inverseEaseInOut as _inverseEaseInOut,
} from '@/app/utils/easingFunctions';

export enum EasingDirection {
  UP,
  DOWN,
}

// kind of vague, but lower results in a tighter elbow - higher differential
// between the fastest and the slowest phases of the animation
const EASING_ELBOW_SIN = 0.5;
const EASING_ELBOW_ROBJOHN = 2;
const easeOutSine = _easeOutSine(EASING_ELBOW_SIN);
const inverseEaseOutSine = _inverseEaseOutSine(EASING_ELBOW_SIN);
const easeInOut = _easeInOut(EASING_ELBOW_ROBJOHN);
const inverseEaseInOut = _inverseEaseInOut(EASING_ELBOW_ROBJOHN);

const EASING_STRATEGY = {
  easeOut: {
    ease: easeOutSine,
    inverse: inverseEaseOutSine,
  },
  // I guess there are already inverses of each other, so why not just swap them
  easeIn: {
    ease: inverseEaseOutSine,
    inverse: easeOutSine,
  },
  easeInOut: {
    ease: easeInOut,
    inverse: inverseEaseInOut,
  }
} as const;

const requestEasingFrames = (
  startingFactor: number,
  totalDuration: number,
  direction: EasingDirection,
  callback: (easingFactor: number) => void,
  strategy: keyof typeof EASING_STRATEGY = 'easeInOut'
) => {
  // using the current easing factor, find the time we're at in the easing
  // curve indicated by direction, then finish the animation from that point
  const isUp = direction === EasingDirection.UP;
  let normTime = isUp
    ? EASING_STRATEGY[strategy].inverse(startingFactor)
    : EASING_STRATEGY[strategy].inverse(1 - startingFactor);
  let prevTime = Date.now();
  let currentFrameId: number;

  const stopAnimation = () => {
    if (currentFrameId) {
      cancelAnimationFrame(currentFrameId);
    }
  }

  const updateEasingFactor: FrameRequestCallback = () => {
    const currTime = Date.now();
    const msPassed = currTime - prevTime;
    const normMsPassed = msPassed / totalDuration;
    prevTime = currTime;
    normTime = Math.min(normTime + normMsPassed, 1);

    const easingFactor = isUp
      ? EASING_STRATEGY[strategy].ease(normTime)
      : 1 - EASING_STRATEGY[strategy].ease(normTime);

    const limitReached = isUp
      ? easingFactor === 1
      : easingFactor === 0;

    if (limitReached) stopAnimation();
    else currentFrameId = requestAnimationFrame(updateEasingFactor);

    callback(easingFactor);
  }

  requestAnimationFrame(updateEasingFactor);

  return stopAnimation;
}

export const useEaseUpDown = (duration: number, direction = EasingDirection.UP) => {
  const [easingFactor, setEasingFactor] = useState(0);

  useEffect(
    () => requestEasingFrames(easingFactor, duration, direction, setEasingFactor),
    // easingFactor needs to be tracked in state to fire rerenders for components using this hook,
    // but this effect should only really fire when direction changes (otherwise animation will be
    // continually stopped and restarted)
    [duration, direction] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return easingFactor;
}

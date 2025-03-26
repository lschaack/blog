import { EASING_STRATEGY, EasingStrategy } from '@/app/utils/easingFunctions';

export enum EasingDirection {
  UP,
  DOWN,
}

export const requestEasingFrames = (
  startingFactor: number,
  totalDuration: number,
  direction: EasingDirection,
  callback: (easingFactor: number) => void,
  strategy: EasingStrategy = 'easeInOut'
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

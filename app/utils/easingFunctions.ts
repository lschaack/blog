import { curry } from "lodash/fp";

// Get easing factor from time (0 to 1)
export const easeOutSine = curry(
  (elbow: number, time: number) => Math.pow(Math.sin(Math.PI * time / 2), elbow)
);

// Get time from easing factor (0 to 1)
export const inverseEaseOutSine = curry(
  (elbow: number, factor: number) => 2 * Math.asin(Math.pow(factor, 1 / elbow)) / Math.PI
);

// https://math.stackexchange.com/a/121755
export const easeInOut = curry(
  (elbow: number, time: number) => {
    const timeToElbow = Math.pow(time, elbow);

    return timeToElbow / (timeToElbow + Math.pow(1 - time, elbow));
  }
);

export const inverseEaseInOut = curry(
  (elbow: number, factor: number) => easeInOut(1 / elbow, factor)
);

export const springInPlace = curry(
  (bounces: number, time: number) => (1 - time) * Math.sin(bounces * Math.PI * time)
);

export const bounceInPlace = curry(
  (bounces: number, time: number) => Math.abs(springInPlace(bounces, time))
);

// kind of vague, but lower results in a tighter elbow - higher differential
// between the fastest and the slowest phases of the animation
const EASING_ELBOW_SIN = 0.5;
const EASING_ELBOW_ROBJOHN = 2;

export const EASING_STRATEGY = {
  easeOut: {
    ease: easeOutSine(EASING_ELBOW_SIN),
    inverse: inverseEaseOutSine(EASING_ELBOW_SIN),
  },
  // I guess there are already inverses of each other(EASING_ELBOW_SIN), so why not just swap them
  easeIn: {
    ease: inverseEaseOutSine(EASING_ELBOW_SIN),
    inverse: easeOutSine(EASING_ELBOW_SIN),
  },
  easeInOut: {
    ease: easeInOut(EASING_ELBOW_ROBJOHN),
    inverse: inverseEaseInOut(EASING_ELBOW_ROBJOHN),
  },
  springInPlace: {
    ease: springInPlace(3),
    inverse: () => 0,
  },
  bounceInPlace: {
    ease: bounceInPlace(3),
    inverse: () => 0,
  }
} as const;

export type EasingStrategy = keyof typeof EASING_STRATEGY;

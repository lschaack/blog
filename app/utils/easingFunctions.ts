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

import { curry } from "lodash/fp";

export const easeOutSine = curry((elbow: number, t: number) => Math.pow(Math.sin(Math.PI * t / 2), elbow));

export const inverseEaseOutSine = curry((elbow: number, e: number) => (
  2 * Math.asin(Math.pow(e, 1 / elbow)) / Math.PI)
);

import { clamp, zipWith } from "lodash";

import { LineSegment } from "@/app/utils/findVectorSegmentsInShape";

export type Vec2 = [number, number];

export const add = (a: number, b: number) => a + b;
export const addVec2 = (a: Vec2, b: Vec2) => zipWith(a, b, add) as Vec2;
export const negate = (n: number) => -n;
export const multiplyBy = (by: number) => (n: number) => n * by;
export const multiplyVec = <T extends number[]>(v: T, by: number) => v.map(multiplyBy(by)) as T;
export const segmentToVec2 = (segment: LineSegment) => (
  [
    segment.start.x - segment.end.x,
    segment.start.y - segment.end.y,
  ] as Vec2
)

export const magnitude = <T extends number[]>(vector: T) => {
  return Math.sqrt(
    vector.reduce(
      (sum, n) => sum + n ** 2,
      0
    )
  )
}

export const normalize = <T extends number[]>(vector: T) => {
  const mag = magnitude(vector);

  // TODO: should I be more explicit in warning about this?
  if (mag === 0) return vector;

  return vector.map(n => n / mag) as T;
}

export const clampVec = <T extends number[]>(vector: T, min: number, max: number) => {
  const length = magnitude(vector);

  if (length >= min && length <= max) return vector;

  const direction = normalize(vector);

  return multiplyVec(direction, clamp(length, min, max));
}

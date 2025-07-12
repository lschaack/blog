import { LineSegment } from "@/app/utils/findVectorSegmentsInShape";

// Inline implementations to avoid lodash dependency
const clamp = (value: number, min: number, max: number): number => {
  return value < min ? min : value > max ? max : value;
};

const zipWith = <T, U, R>(arr1: T[], arr2: U[], fn: (a: T, b: U) => R): R[] => {
  const length = Math.min(arr1.length, arr2.length);
  const result: R[] = [];
  for (let i = 0; i < length; i++) {
    result[i] = fn(arr1[i], arr2[i]);
  }
  return result;
};

export type Vec2 = [number, number];

export const add = (a: number, b: number) => a + b;
export const addVec2 = (a: Vec2, b: Vec2) => zipWith(a, b, add) as Vec2;
export const negate = (n: number) => -n;
export const multiply = (a: number, b: number) => a * b;
export const multiplyBy = (by: number) => (n: number) => n * by;
export const multiplyVec = <T extends number[]>(v: T, by: number) => v.map(multiplyBy(by)) as T;
export const dotProduct = <T extends number[]>(a: T, b: T) => zipWith(a, b, multiply).reduce(add);
export const segmentToVec2 = (segment: LineSegment) => (
  [
    segment.startX - segment.endX,
    segment.startY - segment.endY,
  ] as Vec2
)

// Re-export mutable operations for performance-critical code
export {
  createVec2,
  setVec2,
  copyVec2,
  addVec2Mutable,
  multiplyVecMutable,
  segmentToVec2Mutable,
  normalizeVecMutable,
  clampVecMutable,
  lerpVec2Mutable,
  zeroVec2,
  applyForcesMutable
} from "@/app/utils/mutableVector";

export const magnitude = <T extends number[]>(vector: T) => {
  return Math.sqrt(
    vector.reduce(
      (sum, n) => sum + n ** 2,
      0
    )
  )
}

export const normalizeVec = <T extends number[]>(vector: T) => {
  const mag = magnitude(vector);

  // TODO: should I be more explicit in warning about this?
  if (mag === 0) return vector;

  return vector.map(n => n / mag) as T;
}

export const clampVec = <T extends number[]>(vector: T, min: number, max: number) => {
  const length = magnitude(vector);

  if (length >= min && length <= max) return vector;

  const direction = normalizeVec(vector);

  return multiplyVec(direction, clamp(length, min, max));
}


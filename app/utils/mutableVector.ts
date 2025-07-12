import { LineSegment } from "@/app/utils/findVectorSegmentsInShape";
import { getDecay } from "./physicsConsts";

// Inline clamp function to avoid lodash dependency
const clamp = (value: number, min: number, max: number): number => {
  return value < min ? min : value > max ? max : value;
};

export type Vec2 = [number, number];

export const createVec2 = (x = 0, y = 0): Vec2 => [x, y];

export const setVec2 = (vec: Vec2, x: number, y: number): Vec2 => {
  vec[0] = x;
  vec[1] = y;
  return vec;
};

export const copyVec2 = (source: Vec2, target: Vec2): Vec2 => {
  target[0] = source[0];
  target[1] = source[1];
  return target;
};

export const addVec2Mutable = (a: Vec2, b: Vec2): Vec2 => {
  a[0] += b[0];
  a[1] += b[1];
  return a;
};

export const multiplyVecMutable = (vec: Vec2, by: number): Vec2 => {
  vec[0] *= by;
  vec[1] *= by;
  return vec;
};

export const segmentToVec2Mutable = (segment: LineSegment, target: Vec2): Vec2 => {
  target[0] = segment.startX - segment.endX;
  target[1] = segment.startY - segment.endY;
  return target;
};

export const magnitude = (vector: Vec2): number => {
  return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
};

export const normalizeVecMutable = (vector: Vec2): Vec2 => {
  const mag = magnitude(vector);

  if (mag === 0) return vector;

  vector[0] /= mag;
  vector[1] /= mag;
  return vector;
};

export const clampVecMutable = (vector: Vec2, min: number, max: number, tempVec: Vec2): Vec2 => {
  const length = magnitude(vector);

  if (length >= min && length <= max) return vector;

  copyVec2(vector, tempVec);
  normalizeVecMutable(tempVec);

  const clampedLength = clamp(length, min, max);
  multiplyVecMutable(tempVec, clampedLength);

  return copyVec2(tempVec, vector);
};

export const lerpVec2Mutable = (a: Vec2, b: Vec2, t: number): Vec2 => {
  a[0] = a[0] + (b[0] - a[0]) * t;
  a[1] = a[1] + (b[1] - a[1]) * t;
  return a;
};

export const zeroVec2 = (vec: Vec2): Vec2 => {
  vec[0] = 0;
  vec[1] = 0;
  return vec;
};

export const applyForcesMutable = (
  velocity: Vec2,
  forces: Vec2[],
  delta: number,
  tempVec: Vec2
): Vec2 => {
  zeroVec2(tempVec);

  for (let i = 0; i < forces.length; i++) {
    addVec2Mutable(tempVec, forces[i]);
  }

  multiplyVecMutable(tempVec, delta);
  multiplyVecMutable(
    velocity,
    getDecay(delta),
  );
  addVec2Mutable(velocity, tempVec);

  return velocity;
};

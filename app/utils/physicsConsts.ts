import {
  copyVec2,
  magnitude,
  multiplyBy,
  multiplyVecMutable,
  negate,
  normalizeVec,
  normalizeVecMutable,
  Vec2
} from "@/app/utils/vector";

export const DECAY = 0.997;
export const VELOCITY_ANIMATION_THRESHOLD = 0.01;
export const OFFSET_ANIMATION_THRESHOLD = 0.1;
export const SPRING_STIFFNESS = 0.001;
export const BUBBLE_STIFFNESS = 0.01;
export const BUBBLE_OVERKILL = 1;
export const BUBBLE_BOUNDARY = 8;
export const PHYSICS_FRAME_RATE_MS = 1000 / 60;

export const getDecay = (delta: number) => Math.pow(DECAY, delta);

export const getSpringForceVec2 = (offset: Vec2, stiffness: number) => {
  const length = magnitude(offset);
  const forceVal = length * stiffness;
  const direction = normalizeVec(offset.map(negate));
  const force = direction.map(multiplyBy(forceVal));

  return force as Vec2;
}

export const getSpringForceVec2Mutable = (target: Vec2, offset: Vec2, stiffness: number) => {
  const length = magnitude(offset);
  const forceVal = length * stiffness;

  copyVec2(offset, target);
  target[0] = -target[0];
  target[1] = -target[1];
  normalizeVecMutable(target);
  multiplyVecMutable(target, forceVal);

  return target as Vec2;
}

export const getSpringForce = (length: number, stiffness: number, target = 0) => {
  return (target - length) * stiffness;
}

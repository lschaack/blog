import {
  add,
  addVec2,
  magnitude,
  multiplyBy,
  multiplyVec,
  negate,
  normalizeVec,
  Vec2
} from "@/app/utils/vector";

export const DECAY = 0.997;
export const VELOCITY_ANIMATION_THRESHOLD = 0.01;
export const OFFSET_ANIMATION_THRESHOLD = 0.1;
export const SPRING_STIFFNESS = 0.001;
export const BUBBLE_STIFFNESS = 30;
export const BUBBLE_OVERKILL = 3;
export const PHYSICS_FRAME_RATE_MS = 1000 / 60;

export const getDecay = (delta: number) => Math.pow(DECAY, delta);

export const getSpringForceVec = (offset: Vec2, stiffness: number) => {
  const length = magnitude(offset);
  const forceVal = length * stiffness;
  const direction = normalizeVec(offset.map(negate));
  const force = direction.map(multiplyBy(forceVal));

  return force as Vec2;
}

export const getSpringForce = (length: number, stiffness: number, target = 0) => {
  return (target - length) * stiffness;
}

export const applyForcesVec = (velocity: Vec2, forces: Vec2[], delta: number) => {
  const decay = getDecay(delta);
  const force = multiplyVec(forces.reduce(addVec2), delta);

  const decayed = multiplyVec(velocity, decay);
  const applied = addVec2(decayed, force);

  return applied;
}

export const applyForces = (velocity: number, forces: number[], delta: number) => {
  const decay = getDecay(delta);
  const force = forces.reduce(add) * delta;

  const decayed = velocity * decay;
  const applied = decayed + force;

  return applied;
}


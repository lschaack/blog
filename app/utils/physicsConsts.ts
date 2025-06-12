export const DECAY = 0.997;
export const VELOCITY_ANIMATION_THRESHOLD = 0.01;
export const OFFSET_ANIMATION_THRESHOLD = 0.1;
export const SPRING_STIFFNESS = 0.001;
export const BUBBLE_STIFFNESS = 30;
export const BUBBLE_OVERKILL = 3;
export const PHYSICS_FRAME_RATE_MS = 1000 / 60;

export const getDecay = (delta: number) => Math.pow(DECAY, delta);


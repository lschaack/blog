export const DECAY = 0.997;
export const ANIMATION_THRESHOLD = 0.0001;
export const PHYSICS_FRAME_RATE_MS = 1000 / 60;

export const getDecay = (delta: number) => Math.pow(DECAY, delta);


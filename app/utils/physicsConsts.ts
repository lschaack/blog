export const DECAY = 0.997;
export const ANIMATION_THRESHOLD = 0.0001;

export const getDecay = (delta: number) => Math.pow(DECAY, delta);


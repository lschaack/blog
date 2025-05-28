export const DECAY = 0.997;
export const ANIMATION_THRESHOLD = 0.001;

// TODO: Nice for handling framerates (in theory), not super performant...also not a constant
export const getDecay = (delta: number) => Math.pow(DECAY, delta);


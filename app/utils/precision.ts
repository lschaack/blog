// https://floating-point-gui.de/errors/comparison/
export function nearlyEqual(a: number, b: number, epsilon: number = 0.00000001) {
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  const diff = Math.abs(a - b);

  if (a === b) { // shortcut, handles infinities
    return true;
  } else if (a == 0 || b == 0 || (absA + absB < Number.MIN_VALUE)) {
    // a or b is zero or both are extremely close to it
    // relative error is less meaningful here
    return diff < (epsilon * Number.MIN_VALUE);
  } else { // use relative error
    return diff / Math.min((absA + absB), Number.MAX_VALUE) < epsilon;
  }
}

export const roundToPrecision = (num: number, places = 1) => {
  const multiplier = 10 ** places;

  return Math.round(num * multiplier) / multiplier;
}


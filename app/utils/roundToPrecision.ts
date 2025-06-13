export const roundToPrecision = (num: number, places = 1) => {
  const multiplier = 10 ** places;

  return Math.round(num * multiplier) / multiplier;
}


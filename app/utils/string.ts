export const ensureStartsWith = (input: string, start: string) => (
  input.startsWith(start)
    ? input
    : `${start}${input}`
);

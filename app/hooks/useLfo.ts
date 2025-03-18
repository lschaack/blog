import { useEffect, useState } from "react";

const getLfoValue = (hz: number, phase: number) => {
  return Math.sin((Date.now() / 1000 * hz + phase) * Math.PI * 2);
}

// NOTE: To simplify and speed up computation, phase is in seconds
// and the actual relative phase will depend on the value of hz
export const useLfo = (hz: number, phase = 0) => {
  const [value, setValue] = useState(getLfoValue(hz, phase));

  useEffect(() => {
    let frame: number;

    const animate = () => {
      setValue(getLfoValue(hz, phase));
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  })

  return value;
}

export const useNormLfo = (hz: number, phase = 0) => {
  const lfo = useLfo(hz, phase);

  return (lfo + 1) / 2;
}

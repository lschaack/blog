"use client";

import { useLayoutEffect, useState } from "react";

export const useResizeValue = <TValue>(getValue: () => TValue, initValue: TValue) => {
  const [value, setValue] = useState<TValue>(initValue);

  useLayoutEffect(() => {
    const handleResize = () => setValue(getValue());

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [getValue]);

  return value;
}

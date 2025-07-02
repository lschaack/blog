"use client";

import { debounce } from "lodash";
import { useCallback, useEffect, useState } from "react";

type ElementPossibly = Element | null | undefined;

export const useResizeEffect = <TValue>(
  sideEffect: () => TValue,
  toObserve: Array<ElementPossibly> | (() => Array<ElementPossibly>),
  runOnMount = false,
  debounceMs = 50,
) => {
  useEffect(() => {
    if (runOnMount) sideEffect();

    const handler = debounceMs !== undefined
      ? debounce(sideEffect, debounceMs)
      : sideEffect;

    const observer = new ResizeObserver(handler);
    const elements = Array.isArray(toObserve)
      ? toObserve
      : toObserve();

    for (const element of elements) {
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sideEffect, toObserve, runOnMount, debounceMs]);
}

export const useResizeValue = <TValue>(
  getValue: () => TValue,
  initValue: TValue,
  toObserve: Array<ElementPossibly> | (() => Array<ElementPossibly>),
  debounceMs?: number,
) => {
  const [value, setValue] = useState<TValue>(initValue);

  const handleResize = useCallback(() => setValue(getValue()), [getValue]);

  useResizeEffect(handleResize, toObserve, true, debounceMs);

  return value;
}

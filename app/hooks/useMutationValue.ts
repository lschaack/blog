"use client";

import { useCallback, useEffect, useState } from "react";

export const useMutation = (
  element: HTMLElement | null,
  callback: MutationCallback,
  options: MutationObserverInit,
) => {
  useEffect(() => {
    if (element) {
      const observer = new MutationObserver(callback);

      observer.observe(element, options);

      return () => observer.disconnect();
    }
  }, [element, options, callback]);
}

export const useMutationValue = <TValue>(
  element: HTMLElement | null,
  callback: () => TValue,
  options: MutationObserverInit,
  initValue: TValue,
) => {
  const [value, setValue] = useState<TValue>(initValue);

  const handleMutation: MutationCallback = useCallback(
    () => setValue(callback()),
    [callback]
  );

  useMutation(element, handleMutation, options);

  return value;
}

import { useCallback } from "react";

import { useResizeValue } from "@/app/hooks/useResizeValue";
import { getAbsoluteOffset } from "@/app/utils/dom";

const DEFAULT_OFFSET = { offsetTop: 0, offsetLeft: 0 };

export const useAbsoluteOffset = (element: HTMLElement | null | undefined) => {
  const getOffset = useCallback(() => {
    if (element) {
      return getAbsoluteOffset(element);
    } else {
      return DEFAULT_OFFSET;
    }
  }, [element]);

  const getElementsToObserve = useCallback(() => [
    element?.parentElement,
    window?.document.documentElement
  ], [element?.parentElement]);

  return useResizeValue(getOffset, DEFAULT_OFFSET, getElementsToObserve);
}

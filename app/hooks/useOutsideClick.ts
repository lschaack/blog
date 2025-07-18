import { RefObject, useEffect } from "react"

export const useOutsideClick = (elementRef: RefObject<HTMLElement | null>, callback: (e: MouseEvent) => void, enable = true, capture = true) => {
  useEffect(() => {
    const options = {
      capture
    };

    const handleOutsideClick = (e: MouseEvent) => {
      const element = elementRef.current;

      if (element && enable) {
        const isOutsideClick = !element.contains(e.target as Node);

        if (isOutsideClick) callback(e);
      }
    }

    document.addEventListener('click', handleOutsideClick, options);

    return () => document.removeEventListener('click', handleOutsideClick, options);
  }, [callback, capture, elementRef, enable]);
}

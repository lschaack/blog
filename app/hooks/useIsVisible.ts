import { useEffect, useState } from "react";

export const useIsVisible = (callback?: (isVisible: boolean) => void) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const updateVisibility = () => {
      const isVisible = !document.hidden;

      setIsVisible(isVisible);
      callback?.(isVisible);
    }

    document.addEventListener('visibilitychange', updateVisibility);

    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, [callback]);

  return isVisible;
}

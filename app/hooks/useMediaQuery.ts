import { useState, useEffect } from 'react';

// adapted from https://github.com/vercel/next.js/discussions/14810#discussioncomment-61177
export const useMediaQuery = (query: string) => {
  const [targetReached, setTargetReached] = useState(false);

  useEffect(() => {
    const updateTarget = (e: MediaQueryListEvent) => setTargetReached(e.matches);

    const media = window.matchMedia(query);
    media.addEventListener('change', updateTarget);

    // Check on mount (callback is not called until a change occurs)
    if (media.matches) {
      setTargetReached(true);
    }

    return () => media.removeEventListener('change', updateTarget);
  }, [query]);

  return targetReached;
};

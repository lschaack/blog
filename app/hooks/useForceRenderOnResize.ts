'use client';

import debounce from "lodash/debounce";
import { useCallback, useEffect, useReducer } from "react";

export const useForceRenderOnResize = (enable = true) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const requestRender = useCallback(debounce(forceUpdate, 100, {
    leading: false,
    trailing: true,
  }), []);

  useEffect(() => {
    if (enable) window.addEventListener('resize', requestRender);

    return () => window.removeEventListener('resize', requestRender);
  }, [requestRender, enable]);
}

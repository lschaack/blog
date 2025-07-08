import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";
import debounce from "lodash/debounce";

// Given an initial state and a source of truth state setter, provides an
// immediately-updating [state, setState] pair while debouncing the source of truth
export const useDebouncedState = <S>(
  initState: S,
  setState: Dispatch<SetStateAction<S>>,
  timeMs = 20,
): [S, Dispatch<SetStateAction<S>>] => {
  const [localValue, _setLocalValue] = useState<S>(initState);

  const setSourceOfTruth = useMemo(() => debounce(setState, timeMs), [setState, timeMs]);

  const setLocalValue: Dispatch<SetStateAction<S>> = useCallback(action => {
    _setLocalValue(action);
    setSourceOfTruth(action);
  }, [setSourceOfTruth]);

  return useMemo(() => [localValue, setLocalValue], [localValue, setLocalValue]);
}


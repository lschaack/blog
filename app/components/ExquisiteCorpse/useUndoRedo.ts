import { useState, useCallback, useMemo, useReducer } from 'react';

type UseHistory<T> = {
  current: T;
  setCurrent: (value: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
};

export const useHistory = <T>(initialValue: T): UseHistory<T> => {
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // absoluteIndex provides a unique ID for each entry regardless of undo/redo
  // history, which is useful for creating unique keys when entries are mapped
  // onto components, inspired by:
  // https://dev.to/arthurbiensur/kind-of-getting-the-memory-address-of-a-javascript-object-2mnd
  const [absoluteIndex, increment] = useReducer(prev => prev + 1, 0);
  const knownObjects = useMemo(() => new Map<T, number>(), []);

  const current = history[currentIndex];

  const setCurrent = useCallback((value: T) => {
    setHistory(prev => {
      // remove known objects to avoid ballooning memory
      const nOverwrites = history.length - currentIndex - 1;
      if (nOverwrites > 0) {
        for (let i = currentIndex + 1; i < history.length; i++) {
          knownObjects.delete(history[i]);
        }
      }

      // Remove all items after current index (redo history)
      const newHistory = prev.slice(0, currentIndex + 1);
      // Add new value
      newHistory.push(value);
      // add ID
      knownObjects.set(value, absoluteIndex);
      increment();

      return newHistory;
    });
    setCurrentIndex(prev => prev + 1);
  }, [absoluteIndex, currentIndex, history, knownObjects]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, history.length]);

  const clear = useCallback(() => {
    setHistory([initialValue]);
    setCurrentIndex(0);
  }, [initialValue]);

  return {
    current,
    setCurrent,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    clear,
  };
};

import { useState, useCallback } from 'react';

type UseUndoRedoReturn<T> = {
  current: T;
  setCurrent: (value: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
};

export const useUndoRedo = <T>(initialValue: T): UseUndoRedoReturn<T> => {
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const current = history[currentIndex];
  
  const setCurrent = useCallback((value: T) => {
    setHistory(prev => {
      // Remove all items after current index (redo history)
      const newHistory = prev.slice(0, currentIndex + 1);
      // Add new value
      newHistory.push(value);
      return newHistory;
    });
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

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
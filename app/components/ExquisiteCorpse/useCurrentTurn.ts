import { useState, useCallback } from "react";
import { Line } from "./Sketchpad";

export const useCurrentTurn = () => {
  const [currentLine, setCurrentLine] = useState<Line[]>([]);
  const [history, setHistory] = useState<Line[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // History management
  const addToHistory = useCallback((newLines: Line[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLines);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Line editing - only allow one line per turn
  const setLine = useCallback((newLines: Line[]) => {
    // Take only the last line (one line per turn)
    const singleLine = newLines.slice(-1);
    setCurrentLine(singleLine);
    addToHistory(singleLine);
  }, [addToHistory]);

  // Undo/Redo within current turn
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousState = history[newIndex];
      setCurrentLine(previousState);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextState = history[newIndex];
      setCurrentLine(nextState);
    }
  }, [historyIndex, history]);

  // Reset current turn (called after ending turn)
  const resetCurrentTurn = useCallback(() => {
    setCurrentLine([]);
    setHistory([[]]);
    setHistoryIndex(0);
  }, []);

  // State queries
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const hasLine = currentLine.length > 0;

  return {
    // Current state
    currentLine,
    hasLine,
    
    // History controls
    canUndo,
    canRedo,
    undo,
    redo,
    
    // Line editing
    setLine,
    
    // Turn lifecycle
    resetCurrentTurn,
  };
};
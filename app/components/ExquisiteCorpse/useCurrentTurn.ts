import { useCallback } from "react";
import { Line } from "@/app/types/exquisiteCorpse";
import { useUndoRedo } from "./useUndoRedo";

export const useCurrentTurn = () => {
  const {
    current: currentLine,
    setCurrent: setCurrentLine,
    undo,
    redo,
    clear: resetCurrentTurn,
    canUndo,
    canRedo,
  } = useUndoRedo<Line[]>([]);

  // Line editing - only allow one line per turn
  const setLine = useCallback((newLines: Line[]) => {
    // Take only the last line (one line per turn)
    const singleLine = newLines.slice(-1);
    setCurrentLine(singleLine);
  }, [setCurrentLine]);

  // Restore current line from JSON
  const restoreCurrentLine = useCallback((newCurrentLine: Line[]) => {
    resetCurrentTurn();
    if (newCurrentLine.length > 0) {
      setCurrentLine(newCurrentLine);
    }
  }, [resetCurrentTurn, setCurrentLine]);

  // State queries
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
    restoreCurrentLine,
  };
};

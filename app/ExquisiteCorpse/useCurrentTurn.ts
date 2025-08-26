import { useCallback } from "react";
import { Line } from "@/app/types/exquisiteCorpse";
import { useHistory } from "./useUndoRedo";

export const useCurrentTurn = () => {
  const {
    current: lines,
    setCurrent: setLines,
    undo,
    redo,
    clear: resetCurrentTurn,
    canUndo,
    canRedo,
  } = useHistory<Line[]>([]);

  // Restore current line from JSON
  const restoreCurrentLine = useCallback((newCurrentLine: Line[]) => {
    resetCurrentTurn();
    if (newCurrentLine.length > 0) {
      setLines(newCurrentLine);
    }
  }, [resetCurrentTurn, setLines]);

  const addLine = (newLine: Line) => {
    setLines([...lines, newLine])
  }

  // State queries
  const hasLine = lines.length > 0;

  return {
    // Current state
    lines,
    hasLine,

    // History controls
    canUndo,
    canRedo,
    undo,
    redo,

    // Line editing
    setLines,
    addLine,

    // Turn lifecycle
    resetCurrentTurn,
    restoreCurrentLine,
  };
};

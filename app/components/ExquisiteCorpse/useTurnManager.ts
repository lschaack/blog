import { useState, useCallback, useMemo } from "react";
import { Line } from "./Sketchpad";

export type Turn = {
  line: Line;
  author: "user" | "ai";
  timestamp: string;
  number: number;
  guess?: string;
}

export const useTurnManager = (onTurnEnd?: (turn: Turn) => void) => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  // Navigation state
  const isViewingCurrentTurn = currentTurnIndex === turns.length;
  const canGoToPrevious = currentTurnIndex > 0;
  const canGoToNext = currentTurnIndex < turns.length;

  // Turn navigation
  const goToPreviousTurn = useCallback(() => {
    if (canGoToPrevious) {
      setCurrentTurnIndex(prev => prev - 1);
    }
  }, [canGoToPrevious]);

  const goToNextTurn = useCallback(() => {
    if (canGoToNext) {
      setCurrentTurnIndex(prev => prev + 1);
    }
  }, [canGoToNext]);

  const goToCurrentTurn = useCallback(() => {
    setCurrentTurnIndex(turns.length);
  }, [turns.length]);

  // Turn completion
  const endTurn = useCallback((line: Line) => {
    const newTurn: Turn = {
      line,
      author: "user",
      timestamp: new Date().toISOString(),
      number: turns.length + 1,
    };

    setTurns(prev => [...prev, newTurn]);
    setCurrentTurnIndex(turns.length + 1);
    onTurnEnd?.(newTurn);

    return newTurn;
  }, [turns.length, onTurnEnd]);

  // Get lines for display up to current viewing index
  const displayLines = useMemo(() => {
    return turns.slice(0, currentTurnIndex).map(turn => turn.line);
  }, [turns, currentTurnIndex]);

  // Clear all turns
  const clearAllTurns = useCallback(() => {
    setTurns([]);
    setCurrentTurnIndex(0);
  }, []);

  // Turn metadata
  const currentTurnNumber = currentTurnIndex + 1;
  const totalTurns = turns.length + 1;

  return {
    // State
    turns,
    currentTurnIndex,
    currentTurnNumber,
    totalTurns,
    isViewingCurrentTurn,
    
    // Navigation
    canGoToPrevious,
    canGoToNext,
    goToPreviousTurn,
    goToNextTurn,
    goToCurrentTurn,
    
    // Turn management
    endTurn,
    clearAllTurns,
    
    // Display
    displayLines,
  };
};
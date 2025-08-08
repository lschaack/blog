import { useState, useCallback, useMemo } from "react";
import { Line } from "./Sketchpad";

export type Turn = {
  line: Line;
  author: "user" | "ai";
  timestamp: string;
  number: number;
  // AI-specific fields
  interpretation?: string; // AI's interpretation of what the drawing represents
  reasoning?: string; // AI's reasoning for adding their line
  // Legacy field for backward compatibility
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

  // Turn completion for user turns
  const endUserTurn = useCallback((line: Line) => {
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

  // Turn completion for AI turns
  const endAITurn = useCallback((line: Line, interpretation: string, reasoning: string) => {
    const newTurn: Turn = {
      line,
      author: "ai",
      timestamp: new Date().toISOString(),
      number: turns.length + 1,
      interpretation,
      reasoning,
    };

    setTurns(prev => [...prev, newTurn]);
    setCurrentTurnIndex(turns.length + 1);
    onTurnEnd?.(newTurn);

    return newTurn;
  }, [turns.length, onTurnEnd]);

  // Generic turn completion (for backward compatibility)
  const endTurn = endUserTurn;

  // Get lines for display up to current viewing index
  const displayLines = useMemo(() => {
    return turns.slice(0, currentTurnIndex).map(turn => turn.line);
  }, [turns, currentTurnIndex]);

  // Clear all turns
  const clearAllTurns = useCallback(() => {
    setTurns([]);
    setCurrentTurnIndex(0);
  }, []);

  // Restore state from JSON
  const restoreState = useCallback((newTurns: Turn[], newCurrentTurnIndex: number) => {
    setTurns(newTurns);
    setCurrentTurnIndex(Math.min(newCurrentTurnIndex, newTurns.length));
  }, []);

  // Turn metadata
  const currentTurnNumber = currentTurnIndex + 1;
  const totalTurns = turns.length + 1;
  const lastTurn = turns[turns.length - 1];
  const isUserTurn = !lastTurn || lastTurn.author === "ai";
  const isAITurn = lastTurn && lastTurn.author === "user";

  return {
    // State
    turns,
    currentTurnIndex,
    currentTurnNumber,
    totalTurns,
    isViewingCurrentTurn,
    
    // Game flow
    isUserTurn,
    isAITurn,
    lastTurn,
    
    // Navigation
    canGoToPrevious,
    canGoToNext,
    goToPreviousTurn,
    goToNextTurn,
    goToCurrentTurn,
    
    // Turn management
    endTurn, // backward compatibility (user turn)
    endUserTurn,
    endAITurn,
    clearAllTurns,
    restoreState,
    
    // Display
    displayLines,
  };
};
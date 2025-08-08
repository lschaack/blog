import { useState, useMemo } from "react";
import { TurnManager, Turn } from "./TurnManager";

export type { Turn } from "./TurnManager";

export const useTurnManager = (onTurnEnd?: (turn: Turn) => void) => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  // Create memoized TurnManager instance with syncState callback
  const turnManager = useMemo(() => {
    return new TurnManager(
      onTurnEnd,
      (newTurns: Turn[], newCurrentTurnIndex: number) => {
        setTurns(newTurns);
        setCurrentTurnIndex(newCurrentTurnIndex);
      }
    );
  }, [onTurnEnd]);

  return {
    turnManager,
    turns,
    currentTurnIndex,
  };
};
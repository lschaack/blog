"use client";

import { useGameContext } from "./GameContext";
import { BaseTurn } from "@/app/types/exquisiteCorpse";
import { canGoToPrevious, canGoToNext, getCurrentTurnNumber, getTotalTurns, isViewingCurrentTurn } from "./gameReducer";
import { Button } from '@/app/components/Button';

export const TurnHistory = <T extends BaseTurn>() => {
  const gameState = useGameContext<T>();

  const handlePrevious = () => {
    gameState.dispatch({ type: "decrement_current_turn" });
  };

  const handleNext = () => {
    gameState.dispatch({ type: "increment_current_turn" });
  };

  const currentTurnNumber = getCurrentTurnNumber(gameState);
  const totalTurns = getTotalTurns(gameState);

  return (
    <div className="flex flex-col gap-2">
      {/* Turn navigation */}
      <div className="flex gap-2 items-center">
        <Button
          label="← Previous"
          onClick={handlePrevious}
          disabled={!canGoToPrevious(gameState)}
          className="flex-1"
        />
        <div className="text-center px-4">
          Turn {currentTurnNumber} of {totalTurns}
          {!isViewingCurrentTurn(gameState) && " (Viewing)"}
        </div>
        <Button
          label="Next →"
          onClick={handleNext}
          disabled={!canGoToNext(gameState)}
          className="flex-1"
        />
      </div>
    </div>
  );
};

"use client";

import { useGameContext } from "./GameContext";
import { BaseTurn } from "./types";
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

  const handleReset = () => {
    gameState.dispatch({ type: "reset" });
  };

  const currentTurnNumber = getCurrentTurnNumber(gameState);
  const totalTurns = getTotalTurns(gameState);
  const showReset = gameState.turns.length > 0;

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

      {/* Reset button */}
      {showReset && (
        <Button
          label="Reset"
          onClick={handleReset}
          className="w-full"
        />
      )}

      {/* Turn History Panel */}
      {gameState.turns.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Turn History</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {gameState.turns.map((turn) => (
              <div key={turn.number} className="text-sm border-l-2 border-gray-300 pl-3">
                <div className="font-medium">
                  Turn {turn.number} - {turn.author === "user" ? "You" : "AI"}
                </div>
                {turn.interpretation && (
                  <div className="text-gray-600 italic">&ldquo;{turn.interpretation}&rdquo;</div>
                )}
                {turn.reasoning && (
                  <div className="text-gray-500 text-xs">{turn.reasoning}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
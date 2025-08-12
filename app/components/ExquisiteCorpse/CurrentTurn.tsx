import { ComponentType, useCallback, useMemo } from "react";
import { useGameContext } from "./GameContext";
import { BaseTurn, CurveTurn, isCurveTurn } from "./types";
import { isViewingCurrentTurn, isUserTurn, getDisplayTurns } from "./gameReducer";
import { useCurrentTurn } from "./useCurrentTurn";
import { Sketchpad, Line } from "./Sketchpad";
import { Button } from '@/app/components/Button';

type CurrentTurnProps<T extends BaseTurn> = {
  handleEndTurn: (turnData: Omit<T, "author" | "timestamp" | "number">) => void;
  renderTurn: ComponentType<{ turn: T }>;
  readOnly?: boolean;
  canvasDimensions: { width: number; height: number };
};

export const CurrentTurn = <T extends BaseTurn>({
  handleEndTurn,
  renderTurn: RenderTurn,
  readOnly = false,
  canvasDimensions
}: CurrentTurnProps<T>) => {
  const gameState = useGameContext<T>();
  const currentTurn = useCurrentTurn();

  // Get display lines from completed turns
  const displayTurns = useMemo(() => getDisplayTurns(gameState), [gameState]);

  // Extract lines from curve turns for display
  const displayLines = useMemo(() => {
    const lines: Line[] = [];
    for (const turn of displayTurns) {
      if (isCurveTurn(turn)) {
        lines.push(turn.line);
      }
    }
    return lines;
  }, [displayTurns]);

  // Combined display lines: completed turns + current turn line
  const allDisplayLines = useMemo(() => {
    return [...displayLines, ...currentTurn.currentLine];
  }, [displayLines, currentTurn.currentLine]);

  // Handle adding lines from Sketchpad
  const handleAddLine = useCallback((newLines: Line[]) => {
    currentTurn.setLine(newLines);
  }, [currentTurn]);

  // Handle ending turn
  const handleEndTurnClick = useCallback(() => {
    if (!currentTurn.hasLine) return;

    // For curve turns, the turn data includes the line
    // For other turn types, this would be different
    const turnData = {
      line: currentTurn.currentLine[0]
    } as Omit<T, "author" | "timestamp" | "number">;

    handleEndTurn(turnData);
    currentTurn.resetCurrentTurn();
  }, [currentTurn, handleEndTurn]);

  const canDraw = !readOnly && isViewingCurrentTurn(gameState) && isUserTurn(gameState);
  const canEndTurn = canDraw && currentTurn.hasLine;

  return (
    <div className="flex flex-col gap-4">
      {/* Undo/Redo controls */}
      <div className="flex gap-2">
        <Button
          label="Undo"
          onClick={currentTurn.undo}
          disabled={!canDraw || !currentTurn.canUndo}
          className="flex-1"
        />
        <Button
          label="Redo"
          onClick={currentTurn.redo}
          disabled={!canDraw || !currentTurn.canRedo}
          className="flex-1"
        />
      </div>

      {/* Sketchpad */}
      <Sketchpad
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        lines={allDisplayLines}
        handleAddLine={line => {
          if (canDraw) {
            handleAddLine(line);
          }
        }}
      />

      {/* End turn button */}
      {isViewingCurrentTurn(gameState) && (
        <Button
          label="End Turn"
          onClick={handleEndTurnClick}
          className="flex-1"
          disabled={!canEndTurn}
        />
      )}

      {/* Turn rendering - show current turn being viewed */}
      {gameState.currentTurnIndex > 0 && gameState.currentTurnIndex <= gameState.turns.length && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <RenderTurn turn={gameState.turns[gameState.currentTurnIndex - 1]} />
        </div>
      )}
    </div>
  );
};

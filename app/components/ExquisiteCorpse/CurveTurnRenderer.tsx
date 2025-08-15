import { useCallback, useMemo } from "react";
import { useGameContext } from "./GameContext";
import { BaseTurn, CanvasDimensions, CurveTurn, Line } from "@/app/types/exquisiteCorpse";
import { isViewingCurrentTurn, isUserTurn, getDisplayTurns, getPreviousTurn } from "./gameReducer";
import { useCurrentTurn } from "./useCurrentTurn";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';

type CurveTurnRendererProps = {
  handleEndTurn: (turnData: Omit<CurveTurn, keyof BaseTurn>) => void;
  readOnly?: boolean;
  canvasDimensions: CanvasDimensions;
};

export const CurveTurnRenderer = ({
  handleEndTurn,
  readOnly = false,
  canvasDimensions
}: CurveTurnRendererProps) => {
  const gameState = useGameContext<CurveTurn>();
  const currentTurn = useCurrentTurn();
  const prevTurn = getPreviousTurn(gameState);

  // Get display lines from completed turns
  const displayTurns = useMemo(() => getDisplayTurns(gameState), [gameState]);

  // Combined display lines: completed turns + current turn line
  const allDisplayLines = useMemo(() => {
    return displayTurns
      .map(turn => turn.path)
      .concat(currentTurn.currentLine);
  }, [displayTurns, currentTurn.currentLine]);

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
      path: currentTurn.currentLine[0]
    } as Omit<CurveTurn, keyof BaseTurn>;

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
      <Button
        label="End Turn"
        onClick={handleEndTurnClick}
        className="flex-1"
        disabled={!isViewingCurrentTurn(gameState) || !canEndTurn}
      />

      {prevTurn && (
        <div className="space-y-2 bg-deep-50 rounded-xl p-4">
          <div className="font-medium">
            Turn {prevTurn.number} - {prevTurn.author === "user" ? "You" : "AI"}
          </div>
          {prevTurn.interpretation && (
            <div className="text-gray-600 font-geist-mono">
              &ldquo;{prevTurn.interpretation}&rdquo;
            </div>
          )}
          {prevTurn.reasoning && (
            <div className="text-gray-500 font-geist-mono text-sm italic">
              &ldquo;{prevTurn.reasoning}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
};

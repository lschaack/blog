import { useCallback, useMemo } from "react";
import { BaseTurn, CanvasDimensions, CurveTurn, Line } from "@/app/types/exquisiteCorpse";
import { useCurrentTurn } from "./useCurrentTurn";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { ensureStartsWith } from "@/app/utils/string";

type MultiplayerCurveTurnRendererProps = {
  handleEndTurn: (turnData: Omit<CurveTurn, keyof BaseTurn>) => void;
  readOnly?: boolean;
  canvasDimensions: CanvasDimensions;
  turns: CurveTurn[];
  currentTurnIndex: number;
};

export const MultiplayerCurveTurnRenderer = ({
  handleEndTurn,
  readOnly = false,
  canvasDimensions,
  turns,
  currentTurnIndex
}: MultiplayerCurveTurnRendererProps) => {
  const currentTurn = useCurrentTurn();

  // Get display lines from completed turns up to current index
  const displayTurns = useMemo(() => {
    return turns.slice(0, currentTurnIndex);
  }, [turns, currentTurnIndex]);

  // Get previous turn for display
  const prevTurn = useMemo(() => {
    return turns[currentTurnIndex - 1];
  }, [turns, currentTurnIndex]);

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
    const turnData = {
      path: currentTurn.currentLine.flat()
    } as Omit<CurveTurn, keyof BaseTurn>;

    handleEndTurn(turnData);
    currentTurn.resetCurrentTurn();
  }, [currentTurn, handleEndTurn]);

  const canDraw = !readOnly;
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
        disabled={!canEndTurn}
      />

      {/* Previous turn info */}
      {prevTurn && (
        <div className="space-y-2 bg-deep-50 rounded-xl p-4">
          <div className="font-light">
            Turn {prevTurn.number} - {prevTurn.author === "user" ? "Human" : "AI"}
          </div>
          {prevTurn.author === "ai" && prevTurn.title && (
            <h2 className="font-semibold font-geist-mono text-xl [font-variant:all-small-caps]">{prevTurn.title}</h2>
          )}
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
          {prevTurn.image && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={ensureStartsWith(prevTurn.image, 'data:image/png;base64,')} />
          )}
        </div>
      )}
    </div>
  );
};
import { useCallback, useMemo } from "react";
import { useGameContext } from "./GameContext";
import { BaseTurn, CanvasDimensions, CurveTurn } from "@/app/types/exquisiteCorpse";
import { isViewingCurrentTurn, isUserTurn, getDisplayTurns, getPreviousTurn, isAuthorAI, isAuthorUser } from "./gameReducer";
import { useCurrentTurn } from "./useCurrentTurn";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { ensureStartsWith } from "@/app/utils/string";
import { SelfDrawingSketch } from "./SelfDrawingPath";

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

  // Handle ending turn
  const handleEndTurnClick = useCallback(() => {
    if (!currentTurn.hasLine) return;

    // For curve turns, the turn data includes the line
    // For other turn types, this would be different
    const turnData = {
      path: currentTurn.lines.flat()
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

      <div className="relative">
        <SelfDrawingSketch
          paths={displayTurns.map(({ path }) => path)}
          dimensions={canvasDimensions}
          className="absolute inset-0 fill-none pointer-events-none"
        />
        <Sketchpad
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          lines={currentTurn.lines}
          handleAddLine={line => {
            if (canDraw) {
              currentTurn.addLine(line);
            }
          }}
        />
      </div>

      {/* End turn button */}
      <Button
        label="End Turn"
        onClick={handleEndTurnClick}
        className="flex-1"
        disabled={!isViewingCurrentTurn(gameState) || !canEndTurn}
      />

      {prevTurn && (
        <div className="space-y-2 bg-deep-50 rounded-xl p-4">
          <div className="font-light">
            Turn {prevTurn.number} - {isAuthorUser(prevTurn.author) ? "You" : "AI"}
          </div>
          {isAuthorAI(prevTurn.author) && (
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

import { useCallback, useEffect, useMemo, useState } from "react";

import { BaseTurn, CanvasDimensions, Path, TurnMetaRenderer, TurnRenderer } from "@/app/types/exquisiteCorpse";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { useHistory } from "./useUndoRedo";

type TurnManagerProps<Turn extends BaseTurn> = {
  handleAddPath: (path: Path, turns: Turn[]) => void;
  readOnly?: boolean;
  dimensions: CanvasDimensions;
  turns: Turn[];
  TurnRenderer: TurnRenderer<Turn>;
  TurnMetaRenderer: TurnMetaRenderer<Turn>;
};

export const TurnManager = <Turn extends BaseTurn>({
  handleAddPath,
  readOnly = false,
  dimensions,
  turns,
  TurnRenderer,
  TurnMetaRenderer,
}: TurnManagerProps<Turn>) => {
  const {
    current: path,
    setCurrent: setPath,
    clear: resetCurrentPath,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<Path[]>([]);

  const hasLine = path.length > 0;

  const lastTurnIndex = turns.length - 1;
  const [currentTurnIndex, setCurrentTurnIndex] = useState(lastTurnIndex);
  const isLatestTurn = currentTurnIndex === lastTurnIndex;

  useEffect(() => setCurrentTurnIndex(turns.length - 1), [turns]);

  const displayTurns = useMemo(() => {
    return turns.slice(0, currentTurnIndex + 1);
  }, [turns, currentTurnIndex]);

  const prevTurn = useMemo(() => {
    return turns[currentTurnIndex];
  }, [turns, currentTurnIndex]);

  const handleAddPathClick = useCallback(() => {
    if (!hasLine) return;

    handleAddPath(path.flat(), turns);
    resetCurrentPath();
  }, [hasLine, handleAddPath, path, turns, resetCurrentPath]);

  const canDraw = !readOnly;
  const canAddPath = canDraw && hasLine;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        <Button
          label="← Previous"
          onClick={() => setCurrentTurnIndex(prev => Math.max(prev - 1, 0))}
          disabled={currentTurnIndex <= 0}
          className="flex-1"
        />
        <div className="grow-1 text-center">
          Turn {currentTurnIndex + 1} of {turns.length}
        </div>
        <Button
          label="Next →"
          onClick={() => setCurrentTurnIndex(prev => Math.min(prev + 1, lastTurnIndex))}
          disabled={currentTurnIndex >= lastTurnIndex}
          className="flex-1"
        />
      </div>

      {/* Undo/Redo controls */}
      <div className="flex gap-2">
        <Button
          label="Undo"
          onClick={undo}
          disabled={!isLatestTurn || !canDraw || !canUndo}
          className="flex-1"
        />
        <Button
          label="Redo"
          onClick={redo}
          disabled={!isLatestTurn || !canDraw || !canRedo}
          className="flex-1"
        />
      </div>

      {/* Sketchpad */}
      <div
        className="relative"
        style={{ maxWidth: dimensions.width, maxHeight: dimensions.height }}
      >
        <TurnRenderer
          turns={displayTurns}
          dimensions={dimensions}
        />

        <Sketchpad
          width={dimensions.width}
          height={dimensions.height}
          lines={isLatestTurn ? path : []}
          readOnly={readOnly}
          handleAddLine={line => {
            if (canDraw) {
              setPath([...path, line]);
            }
          }}
        />
      </div>

      {/* End turn button */}
      <Button
        label="End Turn"
        onClick={handleAddPathClick}
        className="flex-1"
        disabled={!canAddPath}
      />

      {prevTurn && (
        <TurnMetaRenderer
          turn={prevTurn}
          dimensions={dimensions}
        />
      )}
    </div>
  );
};

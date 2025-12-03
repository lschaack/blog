import { useCallback, useEffect, useMemo, useState } from "react";
import { Redo, Undo } from "lucide-react";

import { BaseTurn, CanvasDimensions, Path, TurnMetaRenderer, TurnRenderer } from "@/app/types/exquisiteCorpse";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { useHistory } from "./useUndoRedo";
import { SmoothingLevel, SmoothingLevelToError, SmoothingSelector } from "./SmoothingSelector";
import { IconButton } from "../components/IconButton";

type TurnManagerProps<Turn extends BaseTurn> = {
  handleAddPath: (path: Path, turns: Turn[]) => void;
  readOnly?: boolean;
  dimensions: CanvasDimensions;
  turns: Turn[];
  TurnRenderer: TurnRenderer<Turn>;
  TurnMetaRenderer?: TurnMetaRenderer<Turn>;
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

  const [smoothing, setSmoothing] = useState<SmoothingLevel>('normal');

  const hasLine = path.length > 0;

  const lastTurnIndex = turns.length - 1;
  const [currentTurnIndex, setCurrentTurnIndex] = useState(lastTurnIndex);
  const isLatestTurn = currentTurnIndex === lastTurnIndex;

  useEffect(() => setCurrentTurnIndex(turns.length - 1), [turns]);

  const displayTurns = useMemo(() => {
    return turns.slice(0, currentTurnIndex + 1);
  }, [turns, currentTurnIndex]);

  const currentTurn = useMemo(() => {
    return turns[currentTurnIndex];
  }, [turns, currentTurnIndex]);

  const handleAddPathClick = useCallback(() => {
    if (!hasLine) return;

    handleAddPath(path.flat(), turns);
    resetCurrentPath();
  }, [hasLine, handleAddPath, path, turns, resetCurrentPath]);

  const canDraw = !readOnly;
  const canAddPath = canDraw && hasLine;
  const maxTurnCharCount = turns.length.toString().length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        <Button
          label="← Previous"
          onClick={() => setCurrentTurnIndex(prev => Math.max(prev - 1, 0))}
          disabled={currentTurnIndex <= 0}
          className="flex-1"
        />
        <p className="bg-deep-50 px-4 rounded-lg font-geist-mono text-xl/loose single-row">
          {(currentTurnIndex + 1).toString().padStart(maxTurnCharCount, ' ')} / {turns.length}
        </p>
        <Button
          label="Next →"
          onClick={() => setCurrentTurnIndex(prev => Math.min(prev + 1, lastTurnIndex))}
          disabled={currentTurnIndex >= lastTurnIndex}
          className="flex-1"
        />
      </div>

      <div>
        <div className="flex gap-4 items-end justify-between pb-1.5 select-none">
          <SmoothingSelector
            value={smoothing}
            onChange={setSmoothing}
          />
          <div className="flex gap-2">
            <IconButton
              label="Undo last line"
              onClick={undo}
              disabled={!isLatestTurn || !canDraw || !canUndo}
              className="flex items-center gap-2 rounded-lg"
            >
              <Undo />
            </IconButton>
            <IconButton
              label="Redo last line"
              onClick={redo}
              disabled={!isLatestTurn || !canDraw || !canRedo}
              className="flex items-center gap-2 rounded-lg"
            >
              <Redo />
            </IconButton>
          </div>
        </div>

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
            smoothing={SmoothingLevelToError[smoothing]}
            handleAddLine={line => {
              if (canDraw) {
                setPath([...path, line]);
              }
            }}
          />
        </div>
      </div>

      {/* End turn button */}
      <Button
        label="End Turn"
        onClick={handleAddPathClick}
        className="flex-1"
        disabled={!canAddPath}
      />

      {currentTurn && TurnMetaRenderer && (
        <TurnMetaRenderer
          turn={currentTurn}
          dimensions={dimensions}
        />
      )}
    </div>
  );
};

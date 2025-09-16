import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from 'motion/react';

import { BaseTurn, CanvasDimensions, CurveTurn } from "@/app/types/exquisiteCorpse";
import { useCurrentTurn } from "./useCurrentTurn";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { ensureStartsWith } from "@/app/utils/string";
import { SelfDrawingSketch } from "./SelfDrawingPath";

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
}: MultiplayerCurveTurnRendererProps) => {
  const currentTurn = useCurrentTurn();

  const lastTurnIndex = turns.length - 1;
  const [currentTurnIndex, setCurrentTurnIndex] = useState(lastTurnIndex);
  const isLatestTurn = currentTurnIndex === lastTurnIndex;

  useEffect(() => setCurrentTurnIndex(turns.length - 1), [turns]);

  // Get display lines from completed turns up to current index
  const displayPaths = useMemo(() => {
    return turns.slice(0, currentTurnIndex + 1).map(({ path }) => path);
  }, [turns, currentTurnIndex]);

  // Get previous turn for display
  const prevTurn = useMemo(() => {
    return turns[currentTurnIndex];
  }, [turns, currentTurnIndex]);

  // Handle ending turn
  const handleEndTurnClick = useCallback(() => {
    if (!currentTurn.hasLine) return;

    // For curve turns, the turn data includes the line
    const turnData = {
      path: currentTurn.lines.flat()
    } as Omit<CurveTurn, keyof BaseTurn>;

    handleEndTurn(turnData);
    currentTurn.resetCurrentTurn();
  }, [currentTurn, handleEndTurn]);

  const canDraw = !readOnly;
  const canEndTurn = canDraw && currentTurn.hasLine;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <Button
          label="← Previous"
          onClick={() => setCurrentTurnIndex(prev => Math.max(prev - 1, 0))}
          disabled={currentTurnIndex <= 0}
          className="flex-1"
        />
        <div className="text-center px-4">
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
          onClick={currentTurn.undo}
          disabled={!isLatestTurn || !canDraw || !currentTurn.canUndo}
          className="flex-1"
        />
        <Button
          label="Redo"
          onClick={currentTurn.redo}
          disabled={!isLatestTurn || !canDraw || !currentTurn.canRedo}
          className="flex-1"
        />
      </div>

      {/* Sketchpad */}
      <div className="relative">
        <SelfDrawingSketch
          paths={displayPaths}
          dimensions={canvasDimensions}
          className="absolute inset-0 fill-none pointer-events-none"
        />
        <Sketchpad
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          lines={isLatestTurn ? currentTurn.lines : []}
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
        disabled={!canEndTurn}
      />

      <AnimatePresence>
        {/* Previous turn info */}
        {/* TODO: add presence animation */}
        {prevTurn?.interpretation && (
          <motion.div className="card space-y-2" >
            {prevTurn.title && (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

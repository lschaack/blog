import { useCallback, useMemo } from "react";
import { useGameContext } from "./GameContext";
import { ImageTurn, Line } from "@/app/types/exquisiteCorpse";
import { isViewingCurrentTurn, isUserTurn, getDisplayTurns } from "./gameReducer";
import { useCurrentTurn } from "./useCurrentTurn";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { ensureStartsWith } from "@/app/utils/string";
import { renderLinesToBase64 } from "./imageContext";

type ImageTurnRendererProps = {
  handleEndTurn: (turnData: Omit<ImageTurn, "author" | "timestamp" | "number">) => void;
  readOnly?: boolean;
  canvasDimensions: { width: number; height: number };
};

export const ImageTurnRenderer = ({
  handleEndTurn,
  readOnly = false,
  canvasDimensions
}: ImageTurnRendererProps) => {
  const gameState = useGameContext<ImageTurn>();
  const currentTurn = useCurrentTurn();

  // Get display turns from completed image turns
  const displayTurns = useMemo(() => getDisplayTurns(gameState), [gameState]);

  // For image turns, we need to show the latest image as background
  // and allow the user to draw on top of it
  const backgroundImage = useMemo(() => {
    if (displayTurns.length > 0) {
      // Get the most recent turn's image
      return displayTurns[displayTurns.length - 1].image;
    }
    return null;
  }, [displayTurns]);

  // Combined display lines: just the current turn line (since background is an image)
  const allDisplayLines = useMemo(() => {
    return currentTurn.currentLine;
  }, [currentTurn.currentLine]);

  // Handle adding lines from Sketchpad
  const handleAddLine = useCallback((newLines: Line[]) => {
    currentTurn.setLine(newLines);
  }, [currentTurn]);

  // Handle ending turn
  const handleEndTurnClick = useCallback(async () => {
    if (!currentTurn.hasLine) return;

    try {
      // Render the complete state (background + current line) to base64
      const allLines: Line[] = [];

      // If there's a background image, we need to include it in the rendering
      // For now, we'll just render the current line on top of a white background
      // In a full implementation, you'd want to composite the background image + new line
      allLines.push(...currentTurn.currentLine);

      const imageData = await renderLinesToBase64(
        allLines,
        canvasDimensions.width,
        canvasDimensions.height,
        backgroundImage || undefined
      );

      const turnData = {
        image: imageData
      } as Omit<ImageTurn, "author" | "timestamp" | "number">;

      handleEndTurn(turnData);
      currentTurn.resetCurrentTurn();
    } catch (error) {
      console.error('Failed to render turn to image:', error);
    }
  }, [currentTurn, canvasDimensions.width, canvasDimensions.height, backgroundImage, handleEndTurn]);

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

      {/* Canvas area */}
      <div className="relative">
        {/* Background image if it exists */}
        {backgroundImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ensureStartsWith(backgroundImage, 'data:image/png;base64,')}
            alt="Background"
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            className="absolute inset-0 object-contain"
          />
        )}

        {/* Sketchpad for drawing new lines */}
        <div className="relative">
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
        </div>
      </div>

      {/* End turn button */}
      <Button
        label="End Turn"
        onClick={handleEndTurnClick}
        className="flex-1"
        disabled={!isViewingCurrentTurn(gameState) || !canEndTurn}
      />
    </div>
  );
};

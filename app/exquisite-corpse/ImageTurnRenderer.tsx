import { useCallback, useMemo } from "react";
import { useGameContext } from "./GameContext";
import { BaseTurn, CanvasDimensions, ImageGeminiFlashPreviewTurn, Line } from "@/app/types/exquisiteCorpse";
import { isViewingCurrentTurn, isUserTurn, getDisplayTurns, getPreviousTurn } from "./gameReducer";
import { useCurrentTurn } from "./useCurrentTurn";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { ensureStartsWith } from "@/app/utils/string";
import { renderLinesToBase64 } from "./imageContext";

type ImageTurnRendererProps = {
  handleEndTurn: (turnData: Omit<ImageGeminiFlashPreviewTurn, keyof BaseTurn>) => void;
  readOnly?: boolean;
  canvasDimensions: CanvasDimensions;
};

export const ImageTurnRenderer = ({
  handleEndTurn,
  readOnly = false,
  canvasDimensions
}: ImageTurnRendererProps) => {
  const gameState = useGameContext<ImageGeminiFlashPreviewTurn>();
  const currentTurn = useCurrentTurn();
  const prevTurn = getPreviousTurn(gameState);

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
    return currentTurn.lines;
  }, [currentTurn.lines]);

  // Handle adding lines from Sketchpad
  const handleAddLine = useCallback((newLine: Line) => {
    currentTurn.setLines([...allDisplayLines, newLine]);
  }, [allDisplayLines, currentTurn]);

  // Handle ending turn
  const handleEndTurnClick = useCallback(async () => {
    if (!currentTurn.hasLine) return;

    try {
      // Render the complete state (background + current line) to base64
      const allLines: Line[] = [];

      // If there's a background image, we need to include it in the rendering
      // For now, we'll just render the current line on top of a white background
      // In a full implementation, you'd want to composite the background image + new line
      allLines.push(...currentTurn.lines);

      const imageData = await renderLinesToBase64(
        allLines,
        canvasDimensions.width,
        canvasDimensions.height,
        backgroundImage || undefined
      );

      const turnData = {
        image: imageData
      } as Omit<ImageGeminiFlashPreviewTurn, keyof BaseTurn>;

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

      {prevTurn && (
        <div className="space-y-2 bg-deep-50 rounded-xl p-4">
          <div className="font-medium">
            Turn {prevTurn.number} - {prevTurn.author === "user" ? "You" : "AI"}
          </div>
          {prevTurn.interpretation && (
            <div className="text-gray-500 font-geist-mono text-sm">
              &ldquo;{prevTurn.interpretation}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
};

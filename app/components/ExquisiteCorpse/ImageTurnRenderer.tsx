import { useCallback, useMemo } from "react";
import { useGameContext } from "./GameContext";
import { ImageTurn, Line } from "@/app/types/exquisiteCorpse";
import { isViewingCurrentTurn, isUserTurn, getDisplayTurns } from "./gameReducer";
import { useCurrentTurn } from "./useCurrentTurn";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { ensureStartsWith } from "@/app/utils/string";

type ImageTurnRendererProps = {
  handleEndTurn: (turnData: Omit<ImageTurn, "author" | "timestamp" | "number">) => void;
  readOnly?: boolean;
  canvasDimensions: { width: number; height: number };
};

// Helper function to render lines to a base64 image
const renderLinesToBase64 = async (
  lines: Line[],
  width: number,
  height: number,
  backgroundImage?: string
): Promise<string> => {
  // Get device pixel ratio for DPI scaling
  const dpr = window.devicePixelRatio || 1;

  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Scale the context to handle DPI
  ctx.scale(dpr, dpr);

  // Clear the canvas with white background or draw background image
  if (backgroundImage) {
    // Create an image element to load the background
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load background image'));
      img.src = ensureStartsWith(backgroundImage, 'data:image/png;base64,');
    });

    // Draw the background image
    ctx.drawImage(img, 0, 0, width, height);
  } else {
    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }

  // Set drawing style
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw each line
  lines.forEach(line => {
    if (line.length > 0) {
      ctx.beginPath();
      line.forEach((curve, index) => {
        const [start, cp1, cp2, end] = curve;
        if (index === 0) {
          ctx.moveTo(start[0], start[1]);
        }
        ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]);
      });
      ctx.stroke();
    }
  });

  // Convert to base64
  return canvas.toDataURL('image/png');
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

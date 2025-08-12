"use client";

import { useCallback, useMemo } from "react";
import { useGameContext } from "./GameContext";
import { BaseTurn, isCurveTurn } from "./types";
import { getDisplayTurns } from "./gameReducer";
import { Line, BezierCurve } from "./Sketchpad";
import { Button } from '@/app/components/Button';

type ExportUtilitiesProps = {
  canvasDimensions: { width: number; height: number };
};

// PNG export utility
const renderToPNG = (lines: Line[], width: number, height: number): void => {
  const exportCanvas = document.createElement('canvas');
  const ctx = exportCanvas.getContext('2d')!;

  exportCanvas.width = width;
  exportCanvas.height = height;

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Set drawing style
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Draw all lines
  const drawBezierCurve = (ctx: CanvasRenderingContext2D, curve: BezierCurve) => {
    const [start, cp1, cp2, end] = curve;
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]);
    ctx.stroke();
  };

  const drawLine = (ctx: CanvasRenderingContext2D, line: Line) => {
    line.forEach(curve => drawBezierCurve(ctx, curve));
  };

  lines.forEach(line => drawLine(ctx, line));

  // Convert to blob and download
  exportCanvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sketch-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png', 1.0);
};

// JSON export utility
const exportToJSON = <T extends BaseTurn>(gameState: { turns: T[] }): void => {
  const exportData = {
    version: 1,
    timestamp: Date.now(),
    gameState: {
      turns: gameState.turns
    }
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exquisite-corpse-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const ExportUtilities = <T extends BaseTurn>({
  canvasDimensions
}: ExportUtilitiesProps) => {
  const gameState = useGameContext<T>();

  // Get display lines from completed turns for PNG export
  const displayLines = useMemo(() => {
    const displayTurns = getDisplayTurns(gameState);
    const lines: Line[] = [];

    for (const turn of displayTurns) {
      if (isCurveTurn(turn)) {
        lines.push(turn.line);
      }
    }

    return lines;
  }, [gameState]);

  const handleExportPNG = useCallback(() => {
    renderToPNG(displayLines, canvasDimensions.width, canvasDimensions.height);
  }, [displayLines, canvasDimensions]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(gameState);
  }, [gameState]);

  const hasContent = displayLines.length > 0;

  return (
    <div className="flex gap-2">
      <Button
        label="Export JSON"
        onClick={handleExportJSON}
        disabled={!hasContent}
        className="flex-1"
      />
      <Button
        label="Render PNG"
        onClick={handleExportPNG}
        disabled={!hasContent}
        className="flex-1"
      />
    </div>
  );
};

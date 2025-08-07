"use client";

import { useCallback, useMemo, useEffect } from "react";

import { BezierCurve, Line, Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { useTurnManager, Turn } from './useTurnManager';
import { useCurrentTurn } from './useCurrentTurn';
import { useAITurn } from './useAITurn';

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
const exportLinesToJSON = (lines: Line[]): void => {
  const exportData = {
    version: 1,
    timestamp: Date.now(),
    lines: lines
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sketch-lines-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

type GameProps = {
  handleEndTurn?: (turn: Turn) => void;
}

export const Game = ({ handleEndTurn }: GameProps = {}) => {
  // Separate turn and line management using custom hooks
  const turnManager = useTurnManager(handleEndTurn);
  const currentTurn = useCurrentTurn();
  const aiTurn = useAITurn();

  // Canvas dimensions (consistent throughout game)
  const canvasDimensions = useMemo(() => ({ width: 512, height: 512 }), []);

  // Combined display lines: completed turns + current turn line
  const displayLines = useMemo(() => {
    return [...turnManager.displayLines, ...currentTurn.currentLine];
  }, [turnManager.displayLines, currentTurn.currentLine]);

  // Auto-trigger AI turn when user completes their turn
  useEffect(() => {
    const processAITurnAutomatically = async () => {
      // Only process AI turn if:
      // 1. It's AI's turn (user just finished)
      // 2. AI is not already processing
      // 3. We're viewing the current turn
      if (turnManager.isAITurn && !aiTurn.isProcessing && turnManager.isViewingCurrentTurn) {
        try {
          const result = await aiTurn.processAITurn(
            displayLines,
            turnManager.turns,
            canvasDimensions
          );

          // Add AI turn to the game
          turnManager.endAITurn(result.line, result.interpretation, result.reasoning);
        } catch (error) {
          // Error is handled by useAITurn hook - just log it
          console.error("AI turn failed:", error);
        }
      }
    };

    processAITurnAutomatically();
  }, [turnManager.isAITurn, aiTurn.isProcessing, turnManager.isViewingCurrentTurn, aiTurn, turnManager, displayLines, canvasDimensions]);

  // Action handlers
  const handleAddLine = useCallback((newLines: Line[]) => {
    currentTurn.setLine(newLines);
  }, [currentTurn]);

  const handleEndTurnClick = useCallback(() => {
    if (!currentTurn.hasLine) return;

    turnManager.endUserTurn(currentTurn.currentLine[0]);
    currentTurn.resetCurrentTurn();
  }, [currentTurn, turnManager]);

  const handleRetryAI = useCallback(async () => {
    if (!aiTurn.canRetry) return;
    
    try {
      const result = await aiTurn.retryAITurn(
        displayLines,
        turnManager.turns,
        canvasDimensions
      );
      
      turnManager.endAITurn(result.line, result.interpretation, result.reasoning);
    } catch (error) {
      console.error("AI retry failed:", error);
    }
  }, [aiTurn, displayLines, turnManager, canvasDimensions]);

  const handleClear = useCallback(() => {
    turnManager.clearAllTurns();
    currentTurn.resetCurrentTurn();
  }, [turnManager, currentTurn]);

  const handleRender = useCallback(() => {
    renderToPNG(displayLines, 512, 512);
  }, [displayLines]);

  const handleExportJSON = useCallback(() => {
    exportLinesToJSON(displayLines);
  }, [displayLines]);

  return (
    <div className="flex flex-col gap-4">
      {/* Game status indicator */}
      <div className="text-center p-2 bg-gray-100 rounded">
        {aiTurn.isProcessing ? (
          <div>
            <div className="font-semibold">AI is drawing...</div>
            <div className="text-sm text-gray-600">{aiTurn.progress}</div>
          </div>
        ) : aiTurn.hasError ? (
          <div>
            <div className="font-semibold text-red-600">AI Turn Failed</div>
            <div className="text-sm text-red-500">{aiTurn.getErrorMessage(aiTurn.error!)}</div>
          </div>
        ) : turnManager.isUserTurn ? (
          <div className="font-semibold text-blue-600">Your Turn</div>
        ) : turnManager.isAITurn ? (
          <div className="font-semibold text-purple-600">AI&apos;s Turn</div>
        ) : (
          <div className="font-semibold">Start Drawing!</div>
        )}
      </div>

      {/* Turn navigation */}
      <div className="flex gap-2 items-center">
        <Button
          label="← Previous"
          onClick={turnManager.goToPreviousTurn}
          disabled={!turnManager.canGoToPrevious}
          className="flex-1"
        />
        <div className="text-center px-4">
          Turn {turnManager.currentTurnNumber} of {turnManager.totalTurns}
          {!turnManager.isViewingCurrentTurn && " (Viewing)"}
        </div>
        <Button
          label="Next →"
          onClick={turnManager.goToNextTurn}
          disabled={!turnManager.canGoToNext}
          className="flex-1"
        />
      </div>

      {/* Current turn controls - always visible to prevent layout shift */}
      <div className="flex gap-2">
        <Button
          label="Undo"
          onClick={currentTurn.undo}
          disabled={!turnManager.isViewingCurrentTurn || !turnManager.isUserTurn || !currentTurn.canUndo}
          className="flex-1"
        />
        <Button
          label="Redo"
          onClick={currentTurn.redo}
          disabled={!turnManager.isViewingCurrentTurn || !turnManager.isUserTurn || !currentTurn.canRedo}
          className="flex-1"
        />
        <Button
          label="Clear All"
          onClick={handleClear}
          disabled={!turnManager.isViewingCurrentTurn || (turnManager.turns.length === 0 && !currentTurn.hasLine)}
          className="flex-1"
        />
      </div>

      {/* Export controls */}
      <div className="flex gap-2">
        <Button
          label="Export JSON"
          onClick={handleExportJSON}
          disabled={displayLines.length === 0}
          className="flex-1"
        />
        <Button
          label="Render PNG"
          onClick={handleRender}
          disabled={displayLines.length === 0}
          className="flex-1"
        />
      </div>

      <Sketchpad
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        lines={displayLines}
        handleAddLine={turnManager.isViewingCurrentTurn && turnManager.isUserTurn && !aiTurn.isProcessing ? handleAddLine : () => {}}
      />

      {/* Turn action buttons */}
      {turnManager.isViewingCurrentTurn && (
        <div className="flex flex-col gap-2">
          {/* End turn button - only for user turns with a line */}
          {turnManager.isUserTurn && currentTurn.hasLine && !aiTurn.isProcessing && (
            <Button
              label="End Turn"
              onClick={handleEndTurnClick}
              className="w-full"
            />
          )}
          
          {/* AI retry button - only when AI failed */}
          {aiTurn.hasError && aiTurn.canRetry && (
            <Button
              label="Retry AI Turn"
              onClick={handleRetryAI}
              className="w-full"
            />
          )}
        </div>
      )}

      {/* Turn information panel */}
      {turnManager.turns.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Turn History</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {turnManager.turns.map((turn) => (
              <div key={turn.number} className="text-sm border-l-2 border-gray-300 pl-3">
                <div className="font-medium">
                  Turn {turn.number} - {turn.author === "user" ? "You" : "AI"}
                </div>
                {turn.interpretation && (
                  <div className="text-gray-600 italic">&ldquo;{turn.interpretation}&rdquo;</div>
                )}
                {turn.reasoning && (
                  <div className="text-gray-500 text-xs">{turn.reasoning}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

"use client";

import { useCallback, useMemo, useEffect, useRef, useLayoutEffect, useState } from "react";

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

type GameState = {
  turns: Turn[];
  currentTurnIndex: number;
  currentLine: Line[];
  timestamp: string;
}

export const Game = ({ handleEndTurn }: GameProps = {}) => {
  const turnInfo = useRef<HTMLDivElement>(null);

  // Separate turn and line management using custom hooks
  const turnManager = useTurnManager(handleEndTurn);
  const currentTurn = useCurrentTurn();
  const aiTurn = useAITurn();

  // JSON editing state
  const [jsonText, setJsonText] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Canvas dimensions (consistent throughout game)
  const canvasDimensions = useMemo(() => ({ width: 512, height: 512 }), []);

  // Combined display lines: completed turns + current turn line
  const displayLines = useMemo(() => {
    return [...turnManager.displayLines, ...currentTurn.currentLine];
  }, [turnManager.displayLines, currentTurn.currentLine]);

  // Serialize game state to JSON
  const gameStateJSON = useMemo(() => {
    const gameState: GameState = {
      turns: turnManager.turns,
      currentTurnIndex: turnManager.currentTurnIndex,
      currentLine: currentTurn.currentLine,
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(gameState, null, 2);
  }, [turnManager.turns, turnManager.currentTurnIndex, currentTurn.currentLine]);

  // Update JSON text when game state changes
  useEffect(() => {
    setJsonText(gameStateJSON);
    setJsonError(null);
  }, [gameStateJSON]);

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

  const handleSyncFromJSON = useCallback(() => {
    try {
      const parsedState = JSON.parse(jsonText) as GameState;

      // Validate structure
      if (!parsedState.turns || !Array.isArray(parsedState.turns)) {
        throw new Error("Invalid game state: 'turns' must be an array");
      }

      if (typeof parsedState.currentTurnIndex !== 'number') {
        throw new Error("Invalid game state: 'currentTurnIndex' must be a number");
      }

      if (!parsedState.currentLine || !Array.isArray(parsedState.currentLine)) {
        throw new Error("Invalid game state: 'currentLine' must be an array");
      }

      // Validate turn structure
      parsedState.turns.forEach((turn, index) => {
        if (!turn.line || !Array.isArray(turn.line)) {
          throw new Error(`Turn ${index + 1}: 'line' must be an array`);
        }
        if (!turn.author || !['user', 'ai'].includes(turn.author)) {
          throw new Error(`Turn ${index + 1}: 'author' must be 'user' or 'ai'`);
        }
        if (typeof turn.number !== 'number') {
          throw new Error(`Turn ${index + 1}: 'number' must be a number`);
        }
      });

      // Apply state
      turnManager.restoreState(parsedState.turns, parsedState.currentTurnIndex);
      currentTurn.restoreCurrentLine(parsedState.currentLine);

      setJsonError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid JSON format";
      setJsonError(errorMessage);
    }
  }, [jsonText, turnManager, currentTurn]);

  useLayoutEffect(() => {
    if (turnInfo.current) {
      turnInfo.current?.scrollTo({
        top: turnInfo.current.scrollHeight,
        behavior: "smooth",
      })
    }
  })

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
        handleAddLine={turnManager.isViewingCurrentTurn && turnManager.isUserTurn && !aiTurn.isProcessing ? handleAddLine : () => { }}
      />

      {/* Turn action buttons */}
      {turnManager.isViewingCurrentTurn && (
        <div className="flex flex-col gap-4">
          <Button
            label="End Turn"
            onClick={handleEndTurnClick}
            className="flex-1"
            disabled={!turnManager.isUserTurn || !currentTurn.hasLine || aiTurn.isProcessing}
          />

          {/* AI retry button - only when AI failed */}
          {aiTurn.hasError && aiTurn.canRetry && (
            <Button
              label="Retry AI Turn"
              onClick={handleRetryAI}
              className="w-full"
            />
          )}

          <Button
            label="Reset"
            onClick={handleClear}
            disabled={!turnManager.isViewingCurrentTurn || (turnManager.turns.length === 0 && !currentTurn.hasLine)}
            className="flex-1"
          />

        </div>
      )}

      {/* Turn information panel */}
      {turnManager.turns.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Turn History</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto" ref={turnInfo}>
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

      {/* JSON State Editor */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Game State (JSON)</h3>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className={`w-full h-64 p-2 font-mono text-sm border rounded resize-y ${jsonError ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          placeholder="Game state will appear here..."
        />
        {jsonError && (
          <div className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded">
            Error: {jsonError}
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <Button
            label="Sync from JSON"
            onClick={handleSyncFromJSON}
            className="flex-1"
            disabled={!jsonText.trim()}
          />
          <Button
            label="Reset to Current"
            onClick={() => {
              setJsonText(gameStateJSON);
              setJsonError(null);
            }}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  )
}

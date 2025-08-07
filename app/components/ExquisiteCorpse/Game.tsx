"use client";

import { useState, useCallback, useMemo } from "react";

import { BezierCurve, Line, Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';

type Turn = {
  line: Line;
  author: "user" | "ai";
  timestamp: string;
  number: number;
  guess?: string;
}

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
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [currentTurnLine, setCurrentTurnLine] = useState<Line[]>([]);
  const [currentTurnHistory, setCurrentTurnHistory] = useState<Line[][]>([[]]);
  const [currentTurnHistoryIndex, setCurrentTurnHistoryIndex] = useState(0);

  // Get all lines from completed turns plus current turn line for display
  const displayLines = useMemo(() => {
    return [...turns.slice(0, currentTurnIndex).map(turn => turn.line), ...currentTurnLine];
  }, [turns, currentTurnIndex, currentTurnLine]);

  // Current turn history management
  const addToCurrentTurnHistory = useCallback((newLines: Line[]) => {
    const newHistory = currentTurnHistory.slice(0, currentTurnHistoryIndex + 1);
    newHistory.push(newLines);
    setCurrentTurnHistory(newHistory);
    setCurrentTurnHistoryIndex(newHistory.length - 1);
  }, [currentTurnHistory, currentTurnHistoryIndex]);

  const undo = useCallback(() => {
    if (currentTurnHistoryIndex > 0) {
      const newIndex = currentTurnHistoryIndex - 1;
      setCurrentTurnHistoryIndex(newIndex);
      const previousState = currentTurnHistory[newIndex];
      setCurrentTurnLine(previousState);
    }
  }, [currentTurnHistoryIndex, currentTurnHistory]);

  const redo = useCallback(() => {
    if (currentTurnHistoryIndex < currentTurnHistory.length - 1) {
      const newIndex = currentTurnHistoryIndex + 1;
      setCurrentTurnHistoryIndex(newIndex);
      const nextState = currentTurnHistory[newIndex];
      setCurrentTurnLine(nextState);
    }
  }, [currentTurnHistoryIndex, currentTurnHistory]);

  const canUndo = currentTurnHistoryIndex > 0;
  const canRedo = currentTurnHistoryIndex < currentTurnHistory.length - 1;
  const isViewingCurrentTurn = currentTurnIndex === turns.length;
  const hasCurrentLine = currentTurnLine.length > 0;

  // Action handlers
  const handleAddLine = useCallback((newLines: Line[]) => {
    // Only allow one line per turn - replace the current line
    const newLine = newLines.slice(-1);
    setCurrentTurnLine(newLine);
    addToCurrentTurnHistory(newLine);
  }, [addToCurrentTurnHistory]);

  const handleEndTurnClick = useCallback(() => {
    if (currentTurnLine.length === 0) return;

    const newTurn: Turn = {
      line: currentTurnLine[0],
      author: "user",
      timestamp: new Date().toISOString(),
      number: turns.length + 1,
    };

    setTurns(prev => [...prev, newTurn]);
    setCurrentTurnLine([]);
    setCurrentTurnHistory([[]]);
    setCurrentTurnHistoryIndex(0);
    setCurrentTurnIndex(turns.length + 1);

    handleEndTurn?.(newTurn);
  }, [currentTurnLine, turns.length, handleEndTurn]);

  const handleClear = useCallback(() => {
    setTurns([]);
    setCurrentTurnIndex(0);
    setCurrentTurnLine([]);
    setCurrentTurnHistory([[]]);
    setCurrentTurnHistoryIndex(0);
  }, []);

  const handlePreviousTurn = useCallback(() => {
    if (currentTurnIndex > 0) {
      setCurrentTurnIndex(prev => prev - 1);
    }
  }, [currentTurnIndex]);

  const handleNextTurn = useCallback(() => {
    if (currentTurnIndex < turns.length) {
      setCurrentTurnIndex(prev => prev + 1);
    }
  }, [currentTurnIndex, turns.length]);

  const handleRender = useCallback(() => {
    renderToPNG(displayLines, 512, 512);
  }, [displayLines]);

  const handleExportJSON = useCallback(() => {
    exportLinesToJSON(displayLines);
  }, [displayLines]);

  return (
    <div className="flex flex-col gap-4">
      {/* Turn navigation */}
      <div className="flex gap-2 items-center">
        <Button
          label="← Previous"
          onClick={handlePreviousTurn}
          disabled={currentTurnIndex === 0}
          className="flex-1"
        />
        <div className="text-center px-4">
          Turn {currentTurnIndex + 1} of {turns.length + 1}
          {!isViewingCurrentTurn && " (Viewing)"}
        </div>
        <Button
          label="Next →"
          onClick={handleNextTurn}
          disabled={currentTurnIndex >= turns.length}
          className="flex-1"
        />
      </div>

      {/* Current turn controls - always visible to prevent layout shift */}
      <div className="flex gap-2">
        <Button
          label="Undo"
          onClick={undo}
          disabled={!isViewingCurrentTurn || !canUndo}
          className="flex-1"
        />
        <Button
          label="Redo"
          onClick={redo}
          disabled={!isViewingCurrentTurn || !canRedo}
          className="flex-1"
        />
        <Button
          label="Clear All"
          onClick={handleClear}
          disabled={!isViewingCurrentTurn || (turns.length === 0 && !hasCurrentLine)}
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
        width={512}
        height={512}
        lines={displayLines}
        handleAddLine={isViewingCurrentTurn ? handleAddLine : () => {}}
      />

      {/* End turn button - only show when viewing current turn and has a line */}
      {isViewingCurrentTurn && hasCurrentLine && (
        <Button
          label="End Turn"
          onClick={handleEndTurnClick}
          className="w-full"
        />
      )}
    </div>
  )
}

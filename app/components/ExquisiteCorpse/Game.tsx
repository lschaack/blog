"use client";

import { useState, useCallback } from "react";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';

type Point = [number, number];
type BezierCurve = [Point, Point, Point, Point]; // [p1, cp1, cp2, p2]
type Line = BezierCurve[];

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

export const Game = () => {
  const [lines, setLines] = useState<Line[]>([]);
  const [history, setHistory] = useState<Line[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // History management functions
  const addToHistory = useCallback((newLines: Line[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLines);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousState = history[newIndex];
      setLines(previousState);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextState = history[newIndex];
      setLines(nextState);
    }
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Action handlers
  const handleAddLine = useCallback((newLines: Line[]) => {
    setLines(newLines);
    addToHistory(newLines);
  }, [addToHistory]);

  const handleClear = useCallback(() => {
    setLines([]);
    setHistory([[]]);
    setHistoryIndex(0);
  }, []);

  const handleRender = useCallback(() => {
    renderToPNG(lines, 512, 512);
  }, [lines]);

  const handleExportJSON = useCallback(() => {
    exportLinesToJSON(lines);
  }, [lines]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          label="Undo"
          onClick={undo}
          disabled={!canUndo}
          className="flex-1"
        />
        <Button
          label="Redo"
          onClick={redo}
          disabled={!canRedo}
          className="flex-1"
        />
        <Button
          label="Clear"
          onClick={handleClear}
          disabled={lines.length === 0}
          className="flex-1"
        />
        <Button
          label="Export JSON"
          onClick={handleExportJSON}
          disabled={lines.length === 0}
          className="flex-1"
        />
        <Button
          label="Render PNG"
          onClick={handleRender}
          disabled={lines.length === 0}
          className="flex-1"
        />
      </div>
      <Sketchpad
        width={512}
        height={512}
        lines={lines}
        handleAddLine={handleAddLine}
      />
    </div>
  )
}

import { FC, useEffect, useRef, useState, useCallback } from "react";
import fitCurve from 'fit-curve';

import { useAnimationFrames } from '@/app/hooks/useAnimationFrames';
import { BezierCurve, Path, Point } from "@/app/types/exquisiteCorpse";
import { bezierCurvesToPath } from './lineConversion';
import { drawPath } from "./imageContext";
import { PathCommand } from "parse-svg-path";

const LINE_COLOR = '#0004a6';

type SketchpadProps = {
  width: number;
  height: number;
  lines: Path[];
  readOnly?: boolean;
  handleAddLine: (line: Path) => void;
}

// Canvas drawing utilities
const clearCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.clearRect(0, 0, width, height);
};

const drawLine = (ctx: CanvasRenderingContext2D, line: Path) => {
  // Line is now Path format
  drawPath(ctx, line);
};

const drawRawPoints = (ctx: CanvasRenderingContext2D, points: Point[]) => {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();
};

// Curve fitting logic
const fitCurvesToPoints = (points: Point[], maxError: number = 50): Path => {
  if (points.length < 2) return [];

  try {
    const curves = fitCurve(points, maxError) as BezierCurve[];
    // Convert to parsed path format
    return bezierCurvesToPath(curves);
  } catch (error) {
    console.warn('Curve fitting failed:', error);
    return [];
  }
};

// Flow:
// - user mouses down
//   - start recording mouse positions
//   - animate the recording — on each frame:
//     - read latest position data and fit a bezier curve
//     - don't commit the curve while the line is being drawn
//     - render all lines to the canvas, including the newly-fit temporary curve
// - user mouses up
//   - fit the line and commit the resulting curve
export const Sketchpad: FC<SketchpadProps> = ({ width, height, lines, readOnly = false, handleAddLine }) => {
  const [dpi, setDpi] = useState<number>(1);
  useEffect(() => setDpi(window.devicePixelRatio || 1), []);

  const [isDrawing, setIsDrawing] = useState(false);
  const currentPoints = useRef<Point[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Setup canvas with DPI scaling
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !dpi) return;

    ctx.scale(dpi, dpi);
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [dpi, width, height]);

  // Animation loop for real-time curve fitting while drawing
  const animateCallback = useCallback(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !isDrawing) return;

    clearCanvas(ctx, width, height);

    // Draw all committed lines
    lines.forEach(line => drawLine(ctx, line));

    // Draw current line being drawn
    if (currentPoints.current.length > 1) {
      ctx.strokeStyle = '#ccc';
      drawRawPoints(ctx, currentPoints.current);

      // Fit and draw temporary curve
      const tempCurves = fitCurvesToPoints(currentPoints.current);
      if (tempCurves.length > 0) {
        ctx.strokeStyle = LINE_COLOR;
        drawPath(ctx, tempCurves);
      }
    }
  }, [isDrawing, lines, width, height]);

  useAnimationFrames(animateCallback, isDrawing);

  // Redraw committed lines when not drawing
  useEffect(() => {
    if (isDrawing) return;

    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;

    clearCanvas(ctx, width, height);
    ctx.strokeStyle = LINE_COLOR;
    lines.forEach(line => drawLine(ctx, line));
  }, [lines, isDrawing, width, height]);

  const getEventPoint = (e: MouseEvent | TouchEvent): Point => {
    const rect = canvas.current!.getBoundingClientRect();
    const { width: baseWidth, height: baseHeight } = canvas.current!;
    const { width: measuredWidth, height: measuredHeight } = rect;

    const scaleX = baseWidth / measuredWidth / dpi;
    const scaleY = baseHeight / measuredHeight / dpi;

    let clientX: number, clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    return [
      currentX * scaleX,
      currentY * scaleY
    ];
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    currentPoints.current = [getEventPoint(e)];
  };

  const continueDrawing = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const point = getEventPoint(e);
    const lastPoint = currentPoints.current[currentPoints.current.length - 1];

    // Only add point if it's different enough from the last one
    if (!lastPoint ||
      Math.abs(point[0] - lastPoint[0]) > 1 ||
      Math.abs(point[1] - lastPoint[1]) > 1) {
      currentPoints.current.push(point);
    }
  };


  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (currentPoints.current.length > 1) {
      const fittedLine = fitCurvesToPoints(currentPoints.current);
      if (fittedLine.length > 0) {
        // round every number to minimize characters in redis and prompt
        handleAddLine(
          fittedLine.map(cmd => (
            cmd.map(val => (
              typeof val === 'number' ? Math.round(val) : val
            )) as PathCommand
          ))
        );
      }
    }

    currentPoints.current = [];
  }, [isDrawing, handleAddLine]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => startDrawing(e.nativeEvent);
  const handleMouseMove = (e: React.MouseEvent) => continueDrawing(e.nativeEvent);
  const handleMouseUp = () => stopDrawing();

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => startDrawing(e.nativeEvent);
  const handleTouchMove = (e: React.TouchEvent) => continueDrawing(e.nativeEvent);
  const handleTouchEnd = () => stopDrawing();

  useEffect(() => {
    const handleMouseUpGlobal = () => stopDrawing();
    const handleMouseLeave = () => stopDrawing();
    const canvasElement = canvas.current;

    document.addEventListener('mouseup', handleMouseUpGlobal);
    canvasElement?.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseup', handleMouseUpGlobal);
      canvasElement?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [stopDrawing]);

  return (
    <canvas
      ref={canvas}
      width={width * dpi}
      height={height * dpi}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="ring-2 ring-deep-500 bg-deep-100 select-none"
      style={{
        touchAction: 'none',
        cursor: readOnly ? 'not-allowed' : 'crosshair',
        width,
        maxWidth: '100%',
        pointerEvents: readOnly ? 'none' : 'unset'
      }}
    />
  );
}

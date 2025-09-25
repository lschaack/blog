import { BezierCurve, CanvasDimensions, Point } from '@/app/types/exquisiteCorpse';
import { Path, PathCommand } from 'parse-svg-path';

// Utility functions for converting between formats

/**
 * Converts BezierCurve to SVG path commands
 * @param curve BezierCurve to convert
 * @param isFirst Whether this is the first curve (needs MoveTo)
 * @returns Array of path commands
 */
export const bezierCurveToPathCommands = (curve: BezierCurve, isFirst: boolean = false): PathCommand[] => {
  const [start, cp1, cp2, end] = curve;
  const commands: PathCommand[] = [];

  if (isFirst) {
    commands.push(['M', start[0], start[1]]);
  }

  commands.push(['C', cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]]);
  return commands;
};

/**
 * Converts array of BezierCurves to Path
 * @param curves Array of BezierCurves
 * @returns Path with path commands
 */
export const bezierCurvesToPath = (curves: BezierCurve[]): Path => {
  if (curves.length === 0) return [];

  const commands: PathCommand[] = [];

  curves.forEach((curve, index) => {
    commands.push(...bezierCurveToPathCommands(curve, index === 0));
  });

  return commands;
};

/**
 * Converts Path back to BezierCurve array for backward compatibility
 * @param path Path to convert
 * @returns Array of BezierCurves
 */
export const parsedPathToBezierCurves = (path: Path): BezierCurve[] => {
  const curves: BezierCurve[] = [];
  let currentPos: Point = [0, 0];

  for (const command of path) {
    switch (command[0]) {
      case 'M':
      case 'm':
        currentPos = [command[1], command[2]];
        break;
      case 'C':
        curves.push([
          currentPos,
          [command[1], command[2]],
          [command[3], command[4]],
          [command[5], command[6]]
        ]);
        currentPos = [command[5], command[6]];
        break;
      case 'c':
        const newEnd: Point = [currentPos[0] + command[5], currentPos[1] + command[6]];
        curves.push([
          currentPos,
          [currentPos[0] + command[1], currentPos[1] + command[2]],
          [currentPos[0] + command[3], currentPos[1] + command[4]],
          newEnd
        ]);
        currentPos = newEnd;
        break;
      // Add more command types as needed
    }
  }

  return curves;
};

/**
 * Validates and sanitizes coordinate points from AI
 * @param points Array of coordinate points to validate
 * @param bounds Canvas bounds for coordinate validation
 * @returns Sanitized points array
 */
export const sanitizeAIPoints = (
  points: Point[],
  bounds: CanvasDimensions
): Point[] => {
  return points
    .filter(point => {
      // Filter out invalid points
      if (!Array.isArray(point) || point.length !== 2) return false;
      const [x, y] = point;
      return typeof x === 'number' && typeof y === 'number' &&
        Number.isFinite(x) && Number.isFinite(y);
    })
    .map(([x, y]) => {
      // Clamp coordinates to canvas bounds
      const clampedX = Math.max(0, Math.min(bounds.width, Math.round(x)));
      const clampedY = Math.max(0, Math.min(bounds.height, Math.round(y)));
      return [clampedX, clampedY] as Point;
    })
    .filter((point, index, array) => {
      // Remove consecutive duplicate points
      if (index === 0) return true;
      const prev = array[index - 1];
      return !(point[0] === prev[0] && point[1] === prev[1]);
    });
};

/**
 * Smooths out coordinate points to reduce noise and improve curve quality
 * @param points Array of coordinate points
 * @param windowSize Size of smoothing window (default: 3)
 * @returns Smoothed points array
 */
export const smoothAIPoints = (points: Point[], windowSize: number = 3): Point[] => {
  if (points.length <= windowSize) return points;

  const smoothed: Point[] = [points[0]]; // Keep first point unchanged

  for (let i = 1; i < points.length - 1; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(points.length, i + Math.floor(windowSize / 2) + 1);

    let avgX = 0;
    let avgY = 0;
    let count = 0;

    for (let j = start; j < end; j++) {
      avgX += points[j][0];
      avgY += points[j][1];
      count++;
    }

    smoothed.push([avgX / count, avgY / count]);
  }

  smoothed.push(points[points.length - 1]); // Keep last point unchanged
  return smoothed;
};

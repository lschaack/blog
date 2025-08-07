import fitCurve from 'fit-curve';
import { Point, BezierCurve, Line } from '@/app/components/ExquisiteCorpse/Sketchpad';

/**
 * Converts AI coordinate points to our Bezier curve format
 * @param points Array of [x, y] coordinate points from AI
 * @param maxError Maximum error tolerance for curve fitting (default: 2)
 * @returns Line array containing fitted Bezier curves
 */
export const convertAIPointsToLine = (points: Point[], maxError: number = 2): Line => {
  // Validate input
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('At least 2 points required for line conversion');
  }

  // Validate each point
  for (const point of points) {
    if (!Array.isArray(point) || point.length !== 2) {
      throw new Error('Each point must be a [x, y] coordinate array');
    }
    const [x, y] = point;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Point coordinates must be finite numbers');
    }
  }

  try {
    // Use fit-curve to convert points to Bezier curves
    const curves = fitCurve(points, maxError);
    return curves as BezierCurve[];
  } catch (error) {
    console.warn('Curve fitting failed:', error);
    
    // Fallback: create simple line segments between consecutive points
    return createFallbackLine(points);
  }
};

/**
 * Creates a fallback line using simple linear interpolation between points
 * @param points Array of coordinate points
 * @returns Line with simple Bezier curves approximating straight line segments
 */
const createFallbackLine = (points: Point[]): Line => {
  if (points.length < 2) return [];

  const curves: BezierCurve[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    
    // Create control points 1/3 and 2/3 along the line for smooth curves
    const cp1: Point = [
      start[0] + (end[0] - start[0]) * 0.33,
      start[1] + (end[1] - start[1]) * 0.33
    ];
    const cp2: Point = [
      start[0] + (end[0] - start[0]) * 0.67,
      start[1] + (end[1] - start[1]) * 0.67
    ];
    
    curves.push([start, cp1, cp2, end]);
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
  bounds: { width: number; height: number }
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

/**
 * Validates that a line has reasonable characteristics for drawing
 * @param line Line to validate
 * @returns boolean indicating if line is valid
 */
export const validateGeneratedLine = (line: Line): boolean => {
  if (!Array.isArray(line) || line.length === 0) return false;
  
  // Check each curve in the line
  for (const curve of line) {
    if (!Array.isArray(curve) || curve.length !== 4) return false;
    
    // Check each point in the curve
    for (const point of curve) {
      if (!Array.isArray(point) || point.length !== 2) return false;
      const [x, y] = point;
      if (typeof x !== 'number' || typeof y !== 'number' || 
          !Number.isFinite(x) || !Number.isFinite(y)) return false;
    }
  }
  
  return true;
};

/**
 * Calculates the total length of a line (approximate)
 * @param line Line to measure
 * @returns Approximate length in pixels
 */
export const calculateLineLength = (line: Line): number => {
  let totalLength = 0;
  
  for (const curve of line) {
    const [start, , , end] = curve;
    // Simple distance calculation (not true curve length, but good approximation)
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }
  
  return totalLength;
};

/**
 * Complete pipeline to process AI points into a validated line
 * @param aiPoints Raw coordinate points from AI
 * @param bounds Canvas bounds
 * @param options Processing options
 * @returns Processed and validated Line
 */
export const processAILine = (
  aiPoints: Point[],
  bounds: { width: number; height: number },
  options: {
    maxError?: number;
    enableSmoothing?: boolean;
    smoothingWindow?: number;
  } = {}
): Line => {
  const {
    maxError = 2,
    enableSmoothing = true,
    smoothingWindow = 3
  } = options;

  // 1. Sanitize points (bounds check, filter invalid)
  let processedPoints = sanitizeAIPoints(aiPoints, bounds);
  
  if (processedPoints.length < 2) {
    throw new Error('Not enough valid points after sanitization');
  }

  // 2. Optional smoothing
  if (enableSmoothing && processedPoints.length > smoothingWindow) {
    processedPoints = smoothAIPoints(processedPoints, smoothingWindow);
  }

  // 3. Convert to Bezier curves
  const line = convertAIPointsToLine(processedPoints, maxError);

  // 4. Validate result
  if (!validateGeneratedLine(line)) {
    throw new Error('Generated line failed validation');
  }

  return line;
};
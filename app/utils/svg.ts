import { ArcCommand, ArcRelativeCommand, ClosePathCommand, CubicBezierCommand, CubicBezierRelativeCommand, CurveCommand, DrawCommand, HorizontalLineToCommand, HorizontalLineToRelativeCommand, LineToCommand, LineToRelativeCommand, MoveToCommand, MoveToRelativeCommand, ParsedPath, PathCommand, QuadraticBezierCommand, QuadraticBezierRelativeCommand, SmoothCubicBezierCommand, SmoothCubicBezierRelativeCommand, SmoothQuadraticBezierCommand, SmoothQuadraticBezierRelativeCommand, VerticalLineToCommand, VerticalLineToRelativeCommand } from "parse-svg-path";
import fitCurve from "fit-curve";

import { CanvasDimensions } from "@/app/types/exquisiteCorpse";

// Type guard functions for path commands
export const isMoveToCommand = (command: PathCommand): command is MoveToCommand => command[0] === 'M';
export const isMoveToRelativeCommand = (command: PathCommand): command is MoveToRelativeCommand => command[0] === 'm';
export const isLineToCommand = (command: PathCommand): command is LineToCommand => command[0] === 'L';
export const isLineToRelativeCommand = (command: PathCommand): command is LineToRelativeCommand => command[0] === 'l';
export const isHorizontalLineToCommand = (command: PathCommand): command is HorizontalLineToCommand => command[0] === 'H';
export const isHorizontalLineToRelativeCommand = (command: PathCommand): command is HorizontalLineToRelativeCommand => command[0] === 'h';
export const isVerticalLineToCommand = (command: PathCommand): command is VerticalLineToCommand => command[0] === 'V';
export const isVerticalLineToRelativeCommand = (command: PathCommand): command is VerticalLineToRelativeCommand => command[0] === 'v';
export const isCubicBezierCommand = (command: PathCommand): command is CubicBezierCommand => command[0] === 'C';
export const isCubicBezierRelativeCommand = (command: PathCommand): command is CubicBezierRelativeCommand => command[0] === 'c';
export const isSmoothCubicBezierCommand = (command: PathCommand): command is SmoothCubicBezierCommand => command[0] === 'S';
export const isSmoothCubicBezierRelativeCommand = (command: PathCommand): command is SmoothCubicBezierRelativeCommand => command[0] === 's';
export const isQuadraticBezierCommand = (command: PathCommand): command is QuadraticBezierCommand => command[0] === 'Q';
export const isQuadraticBezierRelativeCommand = (command: PathCommand): command is QuadraticBezierRelativeCommand => command[0] === 'q';
export const isSmoothQuadraticBezierCommand = (command: PathCommand): command is SmoothQuadraticBezierCommand => command[0] === 'T';
export const isSmoothQuadraticBezierRelativeCommand = (command: PathCommand): command is SmoothQuadraticBezierRelativeCommand => command[0] === 't';
export const isArcCommand = (command: PathCommand): command is ArcCommand => command[0] === 'A';
export const isArcRelativeCommand = (command: PathCommand): command is ArcRelativeCommand => command[0] === 'a';
export const isClosePathCommand = (command: PathCommand): command is ClosePathCommand => command[0] === 'Z' || command[0] === 'z';

export const pathToD = (path: PathCommand[]) => {
  let d = '';

  for (let i = 0; i < path.length; i++) {
    const cmd = path[i];

    d += cmd.join(' ');

    if (i < path.length - 1) d += ' ';
  }

  return d;
}

// utilities for breaking up paths into individual curves and lines, making it possible to
// produce a draw animation which adjusts its speed based on the curvature of the DrawCommand
export type PathSegment<Cmd extends DrawCommand = DrawCommand> = [MoveToCommand, Cmd];
export function breakUpPath(path: PathCommand[]): [MoveToCommand, DrawCommand][] {
  const result: [MoveToCommand, DrawCommand][] = [];
  let currentX = 0;
  let currentY = 0;
  let subPathStartX = 0;
  let subPathStartY = 0;

  for (const command of path) {
    if (isMoveToCommand(command)) {
      currentX = command[1];
      currentY = command[2];
      subPathStartX = currentX;
      subPathStartY = currentY;
    } else if (isMoveToRelativeCommand(command)) {
      currentX += command[1];
      currentY += command[2];
      subPathStartX = currentX;
      subPathStartY = currentY;
    } else if (isClosePathCommand(command)) {
      const moveTo: MoveToCommand = ['M', currentX, currentY];
      const lineTo: LineToCommand = ['L', subPathStartX, subPathStartY];
      result.push([moveTo, lineTo]);

      currentX = subPathStartX;
      currentY = subPathStartY;
    } else {
      const moveTo: MoveToCommand = ['M', currentX, currentY];
      result.push([moveTo, command as DrawCommand]);

      [currentX, currentY] = updateCurrentPosition(command, currentX, currentY);
    }
  }

  return result;
}

function updateCurrentPosition(
  command: PathCommand,
  currentX: number,
  currentY: number,
): [number, number] {
  if (isLineToCommand(command)) {
    return [command[1], command[2]];
  } else if (isLineToRelativeCommand(command)) {
    return [currentX + command[1], currentY + command[2]];
  } else if (isHorizontalLineToCommand(command)) {
    return [command[1], currentY];
  } else if (isHorizontalLineToRelativeCommand(command)) {
    return [currentX + command[1], currentY];
  } else if (isVerticalLineToCommand(command)) {
    return [currentX, command[1]];
  } else if (isVerticalLineToRelativeCommand(command)) {
    return [currentX, currentY + command[1]];
  } else if (isCubicBezierCommand(command)) {
    return [command[5], command[6]];
  } else if (isCubicBezierRelativeCommand(command)) {
    return [currentX + command[5], currentY + command[6]];
  } else if (isSmoothCubicBezierCommand(command)) {
    return [command[3], command[4]];
  } else if (isSmoothCubicBezierRelativeCommand(command)) {
    return [currentX + command[3], currentY + command[4]];
  } else if (isQuadraticBezierCommand(command)) {
    return [command[3], command[4]];
  } else if (isQuadraticBezierRelativeCommand(command)) {
    return [currentX + command[3], currentY + command[4]];
  } else if (isSmoothQuadraticBezierCommand(command)) {
    return [command[1], command[2]];
  } else if (isSmoothQuadraticBezierRelativeCommand(command)) {
    return [currentX + command[1], currentY + command[2]];
  } else if (isArcCommand(command)) {
    return [command[6], command[7]];
  } else if (isArcRelativeCommand(command)) {
    return [currentX + command[6], currentY + command[7]];
  }

  return [currentX, currentY];
}

type GetCurvature = (segment: PathSegment, t: number) => number;
const noCurvature = () => 0;
const arcCurvature: GetCurvature = segment => {
  const [, drawCmd] = segment as PathSegment<ArcCommand | ArcRelativeCommand>;

  // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const [, rx, ry] = drawCmd;
  // For elliptical arc, curvature varies. Using average radius approximation
  const avgRadius = (rx + ry) / 2;

  return avgRadius > 0 ? 1 / avgRadius : 0;
}
const CMD_TO_GET_CURVATURE: Record<CurveCommand[0], GetCurvature> = {
  'C': ([[, startX, startY], drawCmd], t) => {
    // C x1 y1 x2 y2 x y - absolute cubic bezier
    const [, x1, y1, x2, y2, x, y] = drawCmd as CubicBezierCommand;

    return calculateCubicBezierCurvature(startX, startY, x1, y1, x2, y2, x, y, t);
  },
  'c': ([[, startX, startY], drawCmd], t) => {
    // c dx1 dy1 dx2 dy2 dx dy - relative cubic bezier
    const [, dx1, dy1, dx2, dy2, dx, dy] = drawCmd as CubicBezierRelativeCommand;

    return calculateCubicBezierCurvature(
      startX, startY,
      startX + dx1, startY + dy1,
      startX + dx2, startY + dy2,
      startX + dx, startY + dy,
      t
    );
  },
  'S': ([[, startX, startY], drawCmd], t) => {
    // S x2 y2 x y - smooth cubic bezier (control point is reflection of previous)
    // For simplicity, treating as quadratic-like curve
    const [, x2, y2, x, y] = drawCmd as SmoothCubicBezierCommand;

    return calculateQuadraticBezierCurvature(startX, startY, x2, y2, x, y, t);
  },
  's': ([[, startX, startY], drawCmd], t) => {
    const [, dx2, dy2, dx, dy] = drawCmd as SmoothCubicBezierRelativeCommand;

    return calculateQuadraticBezierCurvature(
      startX, startY,
      startX + dx2, startY + dy2,
      startX + dx, startY + dy,
      t
    );
  },
  'Q': ([[, startX, startY], drawCmd], t) => {
    // Q x1 y1 x y - absolute quadratic bezier
    const [, x1, y1, x, y] = drawCmd as QuadraticBezierCommand;

    return calculateQuadraticBezierCurvature(startX, startY, x1, y1, x, y, t);
  },
  'q': ([[, startX, startY], drawCmd], t) => {
    // q dx1 dy1 dx dy - relative quadratic bezier
    const [, dx1, dy1, dx, dy] = drawCmd as QuadraticBezierRelativeCommand;

    return calculateQuadraticBezierCurvature(
      startX, startY,
      startX + dx1, startY + dy1,
      startX + dx, startY + dy,
      t
    );
  },
  // T x y - smooth quadratic bezier
  // Simplified as linear for smooth curves without previous control point info
  'T': noCurvature,
  't': noCurvature,
  'A': arcCurvature,
  'a': arcCurvature,
}

export function getCurvature(segment: PathSegment<CurveCommand>, t: number): number {
  if (t < 0 || t > 1) {
    console.error(`Cannot calculate curvature at ${t} outside of [0, 1]. Using clamped value.`)
  }

  // Clamp t to [0, 1]
  t = Math.max(0, Math.min(1, t));

  const cmd = segment[1][0];

  if (!CMD_TO_GET_CURVATURE[cmd]) {
    console.error(`Cannot calculate curvature for command type "${cmd}"`);

    return 0;
  }

  return CMD_TO_GET_CURVATURE[cmd](segment, t);
}

function calculateCubicBezierCurvature(
  x0: number, y0: number,  // start point
  x1: number, y1: number,  // first control point  
  x2: number, y2: number,  // second control point
  x3: number, y3: number,  // end point
  t: number
): number {
  // First derivative
  const dx = 3 * (1 - t) * (1 - t) * (x1 - x0) +
    6 * (1 - t) * t * (x2 - x1) +
    3 * t * t * (x3 - x2);

  const dy = 3 * (1 - t) * (1 - t) * (y1 - y0) +
    6 * (1 - t) * t * (y2 - y1) +
    3 * t * t * (y3 - y2);

  // Second derivative
  const ddx = 6 * (1 - t) * (x2 - 2 * x1 + x0) +
    6 * t * (x3 - 2 * x2 + x1);

  const ddy = 6 * (1 - t) * (y2 - 2 * y1 + y0) +
    6 * t * (y3 - 2 * y2 + y1);

  // Curvature formula: |x'y'' - y'x''| / (x'^2 + y'^2)^(3/2)
  const numerator = Math.abs(dx * ddy - dy * ddx);
  const denominator = Math.pow(dx * dx + dy * dy, 1.5);

  return denominator > 0 ? numerator / denominator : 0;
}

function calculateQuadraticBezierCurvature(
  x0: number, y0: number,  // start point
  x1: number, y1: number,  // control point
  x2: number, y2: number,  // end point
  t: number
): number {
  // First derivative
  const dx = 2 * (1 - t) * (x1 - x0) + 2 * t * (x2 - x1);
  const dy = 2 * (1 - t) * (y1 - y0) + 2 * t * (y2 - y1);

  // Second derivative (constant for quadratic)
  const ddx = 2 * (x2 - 2 * x1 + x0);
  const ddy = 2 * (y2 - 2 * y1 + y0);

  // Curvature formula
  const numerator = Math.abs(dx * ddy - dy * ddx);
  const denominator = Math.pow(dx * dx + dy * dy, 1.5);

  return denominator > 0 ? numerator / denominator : 0;
}

function isCurveCommand(command: DrawCommand): command is CurveCommand {
  const cmd = command[0];
  return cmd === 'C' || cmd === 'c' || cmd === 'S' || cmd === 's' ||
    cmd === 'Q' || cmd === 'q' || cmd === 'T' || cmd === 't' ||
    cmd === 'A' || cmd === 'a';
}

export function getAnimationTimingFunction(segment: PathSegment): string {
  const [, drawCmd] = segment;

  if (!isCurveCommand(drawCmd)) {
    return 'linear';
  }

  const curveSegment = segment as PathSegment<CurveCommand>;
  const samples = 20; // Number of samples along the curve
  const points: [number, number][] = [];

  // Sample curvature at regular intervals
  const curvatures: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const curvature = getCurvature(curveSegment, t);
    curvatures.push(curvature);
  }

  // Convert curvature to relative time cost (higher curvature = more time)
  // Add a base cost to prevent division by zero and ensure smooth animation
  const baseCost = 0.1;
  const curvatureWeight = 1.0;
  const timeCosts = curvatures.map(k => baseCost + curvatureWeight * k);

  // Calculate cumulative time distribution
  let totalCost = 0;
  const cumulativeCosts: number[] = [];

  for (let i = 0; i <= samples; i++) {
    cumulativeCosts.push(totalCost);
    if (i < samples) {
      totalCost += timeCosts[i];
    }
  }

  // Normalize cumulative costs to [0, 1] and create points for curve fitting
  for (let i = 0; i <= samples; i++) {
    const progress = i / samples; // Input progress (0-1)
    const time = totalCost > 0 ? cumulativeCosts[i] / totalCost : progress; // Output time (0-1)
    points.push([progress, time]);
  }

  // If the timing is effectively linear, return linear
  const firstQuarter = points[Math.floor(samples * 0.25)][1];
  const half = points[Math.floor(samples * 0.5)][1];
  const thirdQuarter = points[Math.floor(samples * 0.75)][1];

  if (Math.abs(firstQuarter - 0.25) < 0.05 &&
    Math.abs(half - 0.5) < 0.05 &&
    Math.abs(thirdQuarter - 0.75) < 0.05) {
    return 'linear';
  }

  try {
    // Fit cubic bezier curve to the timing points
    const curves = fitCurve(points, 0.1);

    if (curves.length > 0) {
      // Use the first curve segment (we're fitting a single cubic bezier)
      const curve = curves[0];
      const [, cp1, cp2] = curve; // [start, control1, control2, end]

      // Extract control points (start should be [0,0], end should be [1,1])
      const x1 = Math.max(0, Math.min(1, cp1[0]));
      const y1 = Math.max(0, Math.min(1, cp1[1]));
      const x2 = Math.max(0, Math.min(1, cp2[0]));
      const y2 = Math.max(0, Math.min(1, cp2[1]));

      return `cubic-bezier(${x1.toFixed(3)},${y1.toFixed(3)},${x2.toFixed(3)},${y2.toFixed(3)})`;
    }
  } catch (error) {
    console.warn('Failed to fit cubic bezier curve, falling back to linear:', error);
  }

  return 'linear';
}

export function renderPathCommandsToSvg(paths: ParsedPath[], dimensions: CanvasDimensions): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">
  <g stroke="#000" stroke-width="2" fill="none">
${paths
      .map((path, index) => `    <path data-turn-number="${index + 1}" d="${pathToD(path)}" />`)
      .join('\n')}
  </g>
</svg>
`.trim();
  ;
}


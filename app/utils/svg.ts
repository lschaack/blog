import { ArcCommand, ArcRelativeCommand, ClosePathCommand, CubicBezierCommand, CubicBezierRelativeCommand, DrawCommand, HorizontalLineToCommand, HorizontalLineToRelativeCommand, LineToCommand, LineToRelativeCommand, MoveToCommand, MoveToRelativeCommand, ParsedPath, PathCommand, QuadraticBezierCommand, QuadraticBezierRelativeCommand, SmoothCubicBezierCommand, SmoothCubicBezierRelativeCommand, SmoothQuadraticBezierCommand, SmoothQuadraticBezierRelativeCommand, VerticalLineToCommand, VerticalLineToRelativeCommand } from "parse-svg-path";

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
export type PathSegment = [MoveToCommand, DrawCommand];
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

export function getCurvature(segment: PathSegment, t: number): number {
  // Clamp t to [0, 1]
  t = Math.max(0, Math.min(1, t));

  const [moveTo, drawCmd] = segment;
  const startX = moveTo[1];
  const startY = moveTo[2];

  // Line commands have zero curvature
  if (isLineToCommand(drawCmd) || isLineToRelativeCommand(drawCmd) ||
    isHorizontalLineToCommand(drawCmd) || isHorizontalLineToRelativeCommand(drawCmd) ||
    isVerticalLineToCommand(drawCmd) || isVerticalLineToRelativeCommand(drawCmd)) {
    return 0;
  }

  // Cubic Bezier curves
  if (isCubicBezierCommand(drawCmd)) {
    // C x1 y1 x2 y2 x y - absolute cubic bezier
    const [, x1, y1, x2, y2, x, y] = drawCmd;
    return calculateCubicBezierCurvature(startX, startY, x1, y1, x2, y2, x, y, t);
  }

  if (isCubicBezierRelativeCommand(drawCmd)) {
    // c dx1 dy1 dx2 dy2 dx dy - relative cubic bezier
    const [, dx1, dy1, dx2, dy2, dx, dy] = drawCmd;
    return calculateCubicBezierCurvature(
      startX, startY,
      startX + dx1, startY + dy1,
      startX + dx2, startY + dy2,
      startX + dx, startY + dy,
      t
    );
  }

  // Smooth cubic bezier
  if (isSmoothCubicBezierCommand(drawCmd)) {
    // S x2 y2 x y - smooth cubic bezier (control point is reflection of previous)
    // For simplicity, treating as quadratic-like curve
    const [, x2, y2, x, y] = drawCmd;
    return calculateQuadraticBezierCurvature(startX, startY, x2, y2, x, y, t);
  }

  if (isSmoothCubicBezierRelativeCommand(drawCmd)) {
    const [, dx2, dy2, dx, dy] = drawCmd;
    return calculateQuadraticBezierCurvature(
      startX, startY,
      startX + dx2, startY + dy2,
      startX + dx, startY + dy,
      t
    );
  }

  // Quadratic Bezier curves
  if (isQuadraticBezierCommand(drawCmd)) {
    // Q x1 y1 x y - absolute quadratic bezier
    const [, x1, y1, x, y] = drawCmd;
    return calculateQuadraticBezierCurvature(startX, startY, x1, y1, x, y, t);
  }

  if (isQuadraticBezierRelativeCommand(drawCmd)) {
    // q dx1 dy1 dx dy - relative quadratic bezier
    const [, dx1, dy1, dx, dy] = drawCmd;
    return calculateQuadraticBezierCurvature(
      startX, startY,
      startX + dx1, startY + dy1,
      startX + dx, startY + dy,
      t
    );
  }

  // Smooth quadratic bezier
  if (isSmoothQuadraticBezierCommand(drawCmd)) {
    // T x y - smooth quadratic bezier
    const [, x, y] = drawCmd;
    // Simplified as linear for smooth curves without previous control point info
    return 0;
  }

  if (isSmoothQuadraticBezierRelativeCommand(drawCmd)) {
    return 0;
  }

  // Arc commands
  if (isArcCommand(drawCmd) || isArcRelativeCommand(drawCmd)) {
    // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    const [, rx, ry] = drawCmd;
    // For elliptical arc, curvature varies. Using average radius approximation
    const avgRadius = (rx + ry) / 2;
    return avgRadius > 0 ? 1 / avgRadius : 0;
  }

  return 0;
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


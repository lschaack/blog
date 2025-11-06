import { ArcCommand, ArcRelativeCommand, ClosePathCommand, CubicBezierCommand, CubicBezierRelativeCommand, CurveCommand, DrawCommand, HorizontalLineToCommand, HorizontalLineToRelativeCommand, LineToCommand, LineToRelativeCommand, MoveToCommand, MoveToRelativeCommand, Path, PathCommand, QuadraticBezierCommand, QuadraticBezierRelativeCommand, SmoothCubicBezierCommand, SmoothCubicBezierRelativeCommand, SmoothQuadraticBezierCommand, SmoothQuadraticBezierRelativeCommand, VerticalLineToCommand, VerticalLineToRelativeCommand } from "parse-svg-path";

import { CanvasDimensions } from "@/app/types/exquisiteCorpse";
import { easeOutRational, exponentialWindow } from "./easingFunctions";
import { dotProduct } from "./vector";
import { lerp } from "./lerp";

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

export const isCurveCommand = (command: PathCommand): command is CurveCommand => CURVE_COMMANDS.has(command[0] as CurveCommand[0]);

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
export function breakUpPath(path: PathCommand[]): PathSegment<DrawCommand>[] {
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
      // avoid making segments that don't go anywhere b/c they never fire onAnimationEnd
      if (currentX !== subPathStartX || currentY !== subPathStartY) {
        const moveTo: MoveToCommand = ['M', currentX, currentY];
        const lineTo: LineToCommand = ['L', subPathStartX, subPathStartY];
        result.push([moveTo, lineTo]);

        currentX = subPathStartX;
        currentY = subPathStartY;
      }
    } else {
      const moveTo: MoveToCommand = ['M', currentX, currentY];
      result.push([moveTo, command as DrawCommand]);

      [currentX, currentY] = updateCurrentPosition(command, currentX, currentY);
    }
  }

  return result;
}

export function splitPathIntoLines(path: PathCommand[]) {
  return path.reduce<PathCommand[][]>((lines, command) => {
    if (isMoveToCommand(command) || isMoveToRelativeCommand(command)) {
      lines.push([command]);
    } else {
      lines.at(-1)!.push(command);
    }

    return lines;
  }, []);
}

export function getSeparation(from: PathSegment, to: PathSegment) {
  const [fromX, fromY] = getEndPosition(from);
  const [, toX, toY] = to[0];
  const separation = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);

  return separation;
}

export function getDirectionChange(from: PathSegment, to: PathSegment) {
  const prevDirection = getSegmentDirection(from, 1);
  const currDirection = getSegmentDirection(to, 0);
  // 0 same direction, 0.5 orthogonal, 1 opposite
  const directionChange = -(dotProduct(prevDirection, currDirection) - 1) / 2;

  return directionChange;
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

const CURVE_COMMANDS = new Set<CurveCommand[0]>(
  Object.keys(CMD_TO_GET_CURVATURE) as CurveCommand[0][]
);

export function getCurvature(segment: PathSegment<CurveCommand>, t: number): number {
  if (t < 0 || t > 1) {
    console.error(`Cannot calculate curvature at ${t} outside of [0, 1]. Using clamped value.`)
  }

  t = Math.max(0, Math.min(1, t));

  const cmd = segment[1][0];

  if (!isCurveCommand(segment[1])) {
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

export function getEndPosition(segment: PathSegment): [number, number] {
  const [moveTo, drawCmd] = segment;
  const startX = moveTo[1];
  const startY = moveTo[2];

  return updateCurrentPosition(drawCmd, startX, startY);
}

type GetSegmentDirection = (segment: PathSegment, t: number) => [number, number];
const linearDirection: GetSegmentDirection = (segment) => {
  const [moveTo] = segment;
  const startX = moveTo[1];
  const startY = moveTo[2];
  const [endX, endY] = getEndPosition(segment);

  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  return length > 0 ? [dx / length, dy / length] : [1, 0];
};

const arcDirection: GetSegmentDirection = (segment, t) => {
  const [, drawCmd] = segment as PathSegment<ArcCommand | ArcRelativeCommand>;

  // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const sweepFlag = drawCmd[5];

  // Calculate tangent direction (perpendicular to radius)
  const angle = t * Math.PI * (sweepFlag ? 1 : -1);
  const tangentX = -Math.sin(angle);
  const tangentY = Math.cos(angle);

  return [tangentX, tangentY];
};

const CMD_TO_GET_DIRECTION: Record<CurveCommand[0], GetSegmentDirection> = {
  'C': ([[, startX, startY], drawCmd], t) => {
    // C x1 y1 x2 y2 x y - absolute cubic bezier
    const [, x1, y1, x2, y2, x, y] = drawCmd as CubicBezierCommand;

    return calculateCubicBezierDirection(startX, startY, x1, y1, x2, y2, x, y, t);
  },
  'c': ([[, startX, startY], drawCmd], t) => {
    // c dx1 dy1 dx2 dy2 dx dy - relative cubic bezier
    const [, dx1, dy1, dx2, dy2, dx, dy] = drawCmd as CubicBezierRelativeCommand;

    return calculateCubicBezierDirection(
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

    return calculateQuadraticBezierDirection(startX, startY, x2, y2, x, y, t);
  },
  's': ([[, startX, startY], drawCmd], t) => {
    const [, dx2, dy2, dx, dy] = drawCmd as SmoothCubicBezierRelativeCommand;

    return calculateQuadraticBezierDirection(
      startX, startY,
      startX + dx2, startY + dy2,
      startX + dx, startY + dy,
      t
    );
  },
  'Q': ([[, startX, startY], drawCmd], t) => {
    // Q x1 y1 x y - absolute quadratic bezier
    const [, x1, y1, x, y] = drawCmd as QuadraticBezierCommand;

    return calculateQuadraticBezierDirection(startX, startY, x1, y1, x, y, t);
  },
  'q': ([[, startX, startY], drawCmd], t) => {
    // q dx1 dy1 dx dy - relative quadratic bezier
    const [, dx1, dy1, dx, dy] = drawCmd as QuadraticBezierRelativeCommand;

    return calculateQuadraticBezierDirection(
      startX, startY,
      startX + dx1, startY + dy1,
      startX + dx, startY + dy,
      t
    );
  },
  'T': linearDirection,
  't': linearDirection,
  'A': arcDirection,
  'a': arcDirection,
};

export function getSegmentDirection(segment: PathSegment, t: number): [number, number] {
  if (t < 0 || t > 1) {
    console.error(`Cannot calculate direction at ${t} outside of [0, 1]. Using clamped value.`);
  }

  t = Math.max(0, Math.min(1, t));

  const [, drawCmd] = segment;

  if (!isCurveCommand(drawCmd)) {
    return linearDirection(segment, t);
  }

  return CMD_TO_GET_DIRECTION[drawCmd[0]](segment, t);
}

function calculateCubicBezierDirection(
  x0: number, y0: number,  // start point
  x1: number, y1: number,  // first control point
  x2: number, y2: number,  // second control point
  x3: number, y3: number,  // end point
  t: number
): [number, number] {
  // First derivative (tangent vector)
  const dx = 3 * (1 - t) * (1 - t) * (x1 - x0) +
    6 * (1 - t) * t * (x2 - x1) +
    3 * t * t * (x3 - x2);

  const dy = 3 * (1 - t) * (1 - t) * (y1 - y0) +
    6 * (1 - t) * t * (y2 - y1) +
    3 * t * t * (y3 - y2);

  // Normalize to get direction
  const length = Math.sqrt(dx * dx + dy * dy);
  return length > 0 ? [dx / length, dy / length] : [1, 0];
}

function calculateQuadraticBezierDirection(
  x0: number, y0: number,  // start point
  x1: number, y1: number,  // control point
  x2: number, y2: number,  // end point
  t: number
): [number, number] {
  // First derivative (tangent vector)
  const dx = 2 * (1 - t) * (x1 - x0) + 2 * t * (x2 - x1);
  const dy = 2 * (1 - t) * (y1 - y0) + 2 * t * (y2 - y1);

  // Normalize to get direction
  const length = Math.sqrt(dx * dx + dy * dy);
  return length > 0 ? [dx / length, dy / length] : [1, 0];
}

const N_SECTIONS = 20;
const SECTION_WIDTH = 1 / (N_SECTIONS - 1);

type SegmentCost = {
  cost: number;
  length: number;
}
// produce a cost on [0.0, 1.0]
export function getSegmentCosts(segment: PathSegment): SegmentCost[] {
  const [, drawCmd] = segment;

  const totalSegmentLength = getSegmentLength(segment);

  if (!isCurveCommand(drawCmd)) {
    return [{ cost: 0, length: totalSegmentLength }];
  }

  const length = totalSegmentLength / N_SECTIONS;

  let samplePoint = 0;
  const costs: SegmentCost[] = [];

  for (let i = 0; i < N_SECTIONS; i++) {
    // curvature is on [0, 1]
    const curvature = getCurvature(segment as PathSegment<CurveCommand>, samplePoint);
    // apply easing to sort of zoom in on the middle values of curvature
    const cost = easeOutRational(1, 0.5, curvature);

    costs.push({ cost, length });

    samplePoint += SECTION_WIDTH;
  }


  return costs;
}

const BASE_COST = 1.0;
const LENGTH_COST_WEIGHT = 0.1;
const CURVE_COST_WEIGHT = 0.9;
const EDGE_COST_WEIGHT = 0.1;
const BASE_EDGE_COST = 1.0;

export function getAnimationTimingFunction(costs: SegmentCost[]) {
  const processedCosts: SegmentCost[] = [];

  const maxLength = Math.max(...costs.map(({ length }) => length));

  for (let i = 0; i < costs.length; i++) {
    const { cost: currCost, length: currLength } = costs[i];
    const { cost: nextCost = 0, length: nextLength = 0 } = costs[i + 1] ?? {};

    const length = (currLength + nextLength / 2);
    const normLength = length / maxLength;

    const normIndex = i / (costs.length - 1);
    const edgeCost = exponentialWindow(5, normIndex) * BASE_EDGE_COST;

    const costDiff = Math.abs(nextCost - currCost);
    const costMixed = lerp(
      lerp(
        lerp(
          BASE_COST,
          costDiff,
          CURVE_COST_WEIGHT,
        ),
        normLength,
        LENGTH_COST_WEIGHT,
      ),
      edgeCost,
      EDGE_COST_WEIGHT,
    );
    const processedCost = costMixed;

    processedCosts.push({
      cost: processedCost,
      length,
    });
  }

  let totalCost = 0;
  let totalLength = 0;
  for (const { cost, length } of processedCosts) {
    totalCost += cost;
    totalLength += length;
  }

  let cumulativeRelativeCost = 0;
  let progress = 0;
  let timingFunction = 'linear(0';

  for (const diff of processedCosts) {
    cumulativeRelativeCost += diff.cost / totalCost;
    progress += diff.length / totalLength;

    timingFunction += `, ${progress} ${cumulativeRelativeCost * 100}%`;
  }

  timingFunction += ', 1)';

  return timingFunction;
}

export function getSegmentLength(segment: PathSegment<DrawCommand>) {
  const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  tempPath.setAttribute('d', pathToD(segment));

  return tempPath.getTotalLength();
}

export function getSegmentLengths(segments: PathSegment<DrawCommand>[]) {
  return segments.map(getSegmentLength);
}

export function createSegmentGapDasharray(
  segments: PathSegment<DrawCommand>[],
  gapSize: number = 3
): string {
  const segmentLengths = getSegmentLengths(segments);

  const dashArray = segmentLengths
    .map(length => `${length} ${gapSize}`)
    .join(' ');

  return dashArray;
}

export function renderPathCommandsToSvg(paths: Path[], dimensions: CanvasDimensions, scale = 1): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width * scale}" height="${dimensions.height * scale}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">
  <g stroke="#000" stroke-width="2" stroke-linecap="round" fill="none">
${paths
      .map((path, index) => `    <path data-turn-number="${index + 1}" d="${pathToD(path)}" />`)
      .join('\n')}
  </g>
</svg>
`.trim();
  ;
}


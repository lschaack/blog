import { ArcCommand, ArcRelativeCommand, ClosePathCommand, CubicBezierCommand, CubicBezierRelativeCommand, HorizontalLineToCommand, HorizontalLineToRelativeCommand, LineToCommand, LineToRelativeCommand, MoveToCommand, MoveToRelativeCommand, ParsedPath, PathCommand, QuadraticBezierCommand, QuadraticBezierRelativeCommand, SmoothCubicBezierCommand, SmoothCubicBezierRelativeCommand, SmoothQuadraticBezierCommand, SmoothQuadraticBezierRelativeCommand, VerticalLineToCommand, VerticalLineToRelativeCommand } from "parse-svg-path";

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

export function renderPathCommandsToSvg(paths: ParsedPath[], dimensions: CanvasDimensions): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimensions.width} ${dimensions.height}">
  <style>
    path { stroke: black; stroke-width: 2; fill: none; }
  </style>
    ${paths
      .map((path, index) => `  <path data-turn-number="${index + 1}" d="${path.map(([type, ...params]) => `${type} ${params.join(' ')}`)}" />`)
      .join('\n')
    }
</svg>
`.trim();
  ;
}


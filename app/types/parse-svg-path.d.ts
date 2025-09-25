// Type definitions for parse-svg-path
// Project: https://github.com/jkroso/parse-svg-path

declare module 'parse-svg-path' {
  // Move commands
  export type MoveToCommand = ['M', number, number];
  export type MoveToRelativeCommand = ['m', number, number];

  // Line commands  
  export type LineToCommand = ['L', number, number];
  export type LineToRelativeCommand = ['l', number, number];
  export type HorizontalLineToCommand = ['H', number];
  export type HorizontalLineToRelativeCommand = ['h', number];
  export type VerticalLineToCommand = ['V', number];
  export type VerticalLineToRelativeCommand = ['v', number];

  // Cubic Bezier curve commands
  export type CubicBezierCommand = ['C', number, number, number, number, number, number];
  export type CubicBezierRelativeCommand = ['c', number, number, number, number, number, number];
  export type SmoothCubicBezierCommand = ['S', number, number, number, number];
  export type SmoothCubicBezierRelativeCommand = ['s', number, number, number, number];

  // Quadratic Bezier curve commands
  export type QuadraticBezierCommand = ['Q', number, number, number, number];
  export type QuadraticBezierRelativeCommand = ['q', number, number, number, number];
  export type SmoothQuadraticBezierCommand = ['T', number, number];
  export type SmoothQuadraticBezierRelativeCommand = ['t', number, number];

  // Arc command
  export type ArcCommand = ['A', number, number, number, number, number, number, number];
  export type ArcRelativeCommand = ['a', number, number, number, number, number, number, number];

  // Close path command
  export type ClosePathCommand = ['Z'] | ['z'];

  // Union type for all path commands
  export type PathCommand =
    | MoveToCommand | MoveToRelativeCommand
    | LineToCommand | LineToRelativeCommand
    | HorizontalLineToCommand | HorizontalLineToRelativeCommand
    | VerticalLineToCommand | VerticalLineToRelativeCommand
    | CubicBezierCommand | CubicBezierRelativeCommand
    | SmoothCubicBezierCommand | SmoothCubicBezierRelativeCommand
    | QuadraticBezierCommand | QuadraticBezierRelativeCommand
    | SmoothQuadraticBezierCommand | SmoothQuadraticBezierRelativeCommand
    | ArcCommand | ArcRelativeCommand
    | ClosePathCommand;

  // Union type for all path commands which result in a line being drawn
  export type DrawCommand = Exclude<PathCommand,
    | MoveToCommand | MoveToRelativeCommand
    | ClosePathCommand
  >;

  // All path commands where curvature != 0
  export type CurveCommand = Exclude<DrawCommand,
    | LineToCommand | LineToRelativeCommand
    | HorizontalLineToCommand | HorizontalLineToRelativeCommand
    | VerticalLineToCommand | VerticalLineToRelativeCommand
  >;

  // A parsed SVG path is an array of path commands
  export type Path = PathCommand[];

  // Main parse function - default export
  declare function parse(path: string): Path;
  export default parse;
}

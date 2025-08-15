import type { ComponentType } from "react";

export type Point = [number, number];

// SVG Path Command Types (parse-svg-path format)
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

// A parsed SVG path is an array of path commands
export type ParsedPath = PathCommand[];

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

// Legacy types for backward compatibility during transition
export type BezierCurve = [Point, Point, Point, Point]; // [p1, cp1, cp2, p2]
export type Line = ParsedPath; // Updated to use parsed path format

export type CanvasDimensions = CanvasDimensions;

// Base turn type with shared fields
export type BaseTurn = {
  author: "user" | "ai";
  timestamp: string;
  number: number;
};

// Turn variant with Line-based drawing
export type CurveTurn = BaseTurn & {
  line: Line;
  interpretation?: string; // AI's interpretation of what the drawing represents
  reasoning?: string; // AI's reasoning for adding their line
};

// Turn variant with base64 image
export type ImageGeminiFlashPreviewTurn = BaseTurn & {
  image: string; // base64-encoded PNG
  interpretation?: string; // AI's interpretation of what the drawing represents
};

// Union type for all turn variants
export type Turn = CurveTurn | ImageGeminiFlashPreviewTurn;

// Serializable game state
export type SerializableGameState<T extends BaseTurn = Turn> = {
  turns: T[];
};

// Full game state including UI state
export type GameState<T extends BaseTurn = Turn> = SerializableGameState<T> & {
  currentTurnIndex: number;
  isFirstTurn: boolean;
  isLastTurn: boolean;
};

// Game action types
export type GameAction<T extends BaseTurn = Turn> =
  | { type: "end_user_turn"; payload: Omit<T, keyof BaseTurn> }
  | { type: "end_ai_turn"; payload: Omit<T, keyof BaseTurn> }
  | { type: "increment_current_turn" }
  | { type: "decrement_current_turn" }
  | { type: "restore"; payload: SerializableGameState<T> }
  | { type: "reset" };

export type TurnRendererProps<Turn extends BaseTurn> = {
  handleEndTurn: (turnData: Omit<Turn, keyof BaseTurn>) => void;
  canvasDimensions: CanvasDimensions;
  readOnly?: boolean;
}

export type TurnRenderer<Turn extends BaseTurn> = ComponentType<TurnRendererProps<Turn>>;

export type GameContext = {
  image: string; // base64 encoded PNG
  canvasDimensions: CanvasDimensions;
  currentTurn: number;
  history: {
    turn: number;
    author: "user" | "ai";
    interpretation?: string;
    reasoning?: string;
  }[];
};

export type AIImageResponseGeminiFlashPreview = {
  interpretation: string;
  image: string; // base64 encoded image representing the AI's addition
};

export type AICurveResponse = {
  interpretation: string;
  curves: BezierCurve[];  // Direct Bezier curve output
  reasoning: string;
};


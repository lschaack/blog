import type { ComponentType } from "react";
import type { ParsedPath } from "parse-svg-path";

export type Point = [number, number];

// Legacy types for backward compatibility during transition
export type BezierCurve = [Point, Point, Point, Point]; // [p1, cp1, cp2, p2]
// FIXME: Line is now effectively any number of lines
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
  path: Line;
  interpretation?: string; // AI's interpretation of what the drawing represents
  reasoning?: string; // AI's reasoning for adding their line
  image?: string;
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

export type GameContext<Turn extends BaseTurn> = {
  image: string; // base64 encoded PNG
  canvasDimensions: CanvasDimensions;
  currentTurn: number;
  history: Turn[];
};

export type RenderPNG<Turn extends BaseTurn> = (history: Turn[], index: number) => Promise<string>;

export type AIImageResponseGeminiFlashPreview = {
  interpretation: string;
  image: string; // base64 encoded image representing the AI's addition
};

export type AICurveResponse = {
  interpretation: string;
  path: ParsedPath;
  reasoning: string;
  image?: string;
};


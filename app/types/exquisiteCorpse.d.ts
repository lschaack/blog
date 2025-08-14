import type { ComponentType } from "react";

export type Point = [number, number];
export type BezierCurve = [Point, Point, Point, Point]; // [p1, cp1, cp2, p2]
export type Line = BezierCurve[];

export type CanvasDimensions = { width: number; height: number };

// Base turn type with shared fields
export type BaseTurn = {
  author: "user" | "ai";
  timestamp: string;
  number: number;
  // AI-specific fields
  interpretation?: string; // AI's interpretation of what the drawing represents
  reasoning?: string; // AI's reasoning for adding their line
};

// Turn variant with Line-based drawing
export type CurveTurn = BaseTurn & {
  line: Line;
};

// Turn variant with base64 image
export type ImageTurn = BaseTurn & {
  image: string; // base64-encoded PNG
};

// Union type for all turn variants
export type Turn = CurveTurn | ImageTurn;

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
  | { type: "end_user_turn"; payload: Omit<T, "author" | "timestamp" | "number"> }
  | { type: "end_ai_turn"; payload: Omit<T, "author" | "timestamp" | "number"> }
  | { type: "increment_current_turn" }
  | { type: "decrement_current_turn" }
  | { type: "restore"; payload: SerializableGameState<T> }
  | { type: "reset" };

export type TurnRendererProps<Turn extends BaseTurn> = {
  handleEndTurn: (turnData: Omit<Turn, "author" | "timestamp" | "number">) => void;
  canvasDimensions: { width: number; height: number };
  readOnly?: boolean;
}

export type TurnRenderer<Turn extends BaseTurn> = ComponentType<TurnRendererProps<Turn>>;

export type GameContext = {
  image: string; // base64 encoded PNG
  canvasDimensions: { width: number; height: number };
  currentTurn: number;
  history: {
    turn: number;
    author: "user" | "ai";
    interpretation?: string;
    reasoning?: string;
  }[];
};

export type AIImageResponse = {
  interpretation: string;
  image: string; // base64 encoded image representing the AI's addition
  reasoning: string;
};

export type AICurveResponse = {
  interpretation: string;
  curves: BezierCurve[];  // Direct Bezier curve output
  reasoning: string;
};


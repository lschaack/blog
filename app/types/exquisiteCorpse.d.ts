import type { ComponentType } from "react";
export type { Path } from "parse-svg-path";

export type Point = [number, number];

// Legacy types for backward compatibility during transition
export type BezierCurve = [Point, Point, Point, Point]; // [p1, cp1, cp2, p2]

export type CanvasDimensions = CanvasDimensions;

// Base turn type with shared fields
export type BaseTurn = {
  author: string;
  timestamp: string;
};

// Turn variant with Line-based drawing
export type CurveTurn = BaseTurn & {
  path: Path;
  interpretation?: string; // AI's interpretation of what the drawing represents
  reasoning?: string; // AI's reasoning for adding their line
  thoughts?: string; // AI's thoughts about the game
  image?: string;
  title?: string;
};

export type TrainingTurn = BaseTurn & {
  path: Path;
}

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

export type ExportedGameState<T extends BaseTurn = Turn> = {
  version: 1,
  timestamp: number,
  gameState: SerializableGameState<T>,
}

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

export type TurnRenderer<Turn extends BaseTurn> = ComponentType<{ turns: Turn[]; dimensions: CanvasDimensions; }>;
export type TurnMetaRenderer<Turn extends BaseTurn> = ComponentType<{ turn: Turn; dimensions: CanvasDimensions; }>;

export type GameContext<Turn extends BaseTurn> = {
  canvasDimensions: CanvasDimensions;
  history: Turn[];
};

export type RenderPNG<Turn extends BaseTurn> = (history: Turn[], index: number) => Promise<string>;

export type AIImageResponseGeminiFlashPreview = {
  interpretation: string;
  image: string; // base64 encoded image representing the AI's addition
};

export type AICurveResponse = {
  interpretation: string;
  path: Path;
  reasoning?: string;
  thoughts?: string;
  image?: string;
  title: string;
};

// custom prefixes for ReplyErrors sent from redis lua scripts
export type CUSTOM_REPLY_ERROR_TYPE =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT';


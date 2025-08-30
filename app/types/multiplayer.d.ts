import type { CurveTurn } from './exquisiteCorpse';

// FIXME: Get these from zod schemas
export type GameType = 'singleplayer' | 'multiplayer';

export type Player = {
  name: string;
  joinedAt: string;
  isActive: boolean;
  connectionStatus: 'connected' | 'disconnected';
  lastSeenAt: string;
  disconnectedAt?: string;
};

export type GameStatus =
  | 'game_started'
  | 'turn_ended'
  | 'ai_turn_started'
  | 'ai_turn_failed'
  | 'player_joined'
  | 'player_left'
  | 'player_promoted'
  | 'player_started_drawing'
  | 'player_stopped_drawing'
  | 'game_ended';

export type MultiplayerGameState = {
  sessionId: string;
  gameId: string;
  type: GameType;
  players: Record<string, Player>; // map from player name to Player
  status: GameStatus;
  turns: CurveTurn[];
  createdAt: string;
  updatedAt: string;
};

export type GameEvent<T = unknown> = {
  type: GameStatus;
  timestamp: string;
  gameId: string;
  data: T;
};

export type CreateGameRequest = {
  gameType: GameType;
  playerName: string;
};

export type JoinGameRequest = {
  playerName: string;
};

export type SubmitTurnRequest = Pick<CurveTurn, 'path'>;

// Event data types
export type GameStartedData = {
  game: MultiplayerGameState;
};

export type TurnEndedData = {
  turn: CurveTurn;
  nextPlayer: string;
};

export type PlayerJoinedData = {
  player: Player;
  isActive: boolean;
};

export type PlayerLeftData = {
  playerId: string;
  playerName: string;
};

export type PlayerPromotedData = {
  playerId: string;
  playerName: string;
};

export type AITurnStartedData = {
  turnNumber: number;
};

export type AITurnFailedData = {
  error: string;
  retryCount: number;
};

export type DrawingStatusData = {
  playerId: string;
  isDrawing: boolean;
};

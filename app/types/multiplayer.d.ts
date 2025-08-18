import type { CurveTurn } from './exquisiteCorpse';

export type GameType = 'multiplayer' | 'ai';

export type Player = {
  id: string;
  name: string;
  connectionId: string;
  joinedAt: string;
  isActive: boolean;
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
  players: Player[];
  currentPlayer: string;
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

export type SubmitTurnRequest = {
  turnData: Omit<CurveTurn, 'author' | 'timestamp' | 'number'>;
};

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
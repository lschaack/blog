import type { CanvasDimensions, CurveTurn } from './exquisiteCorpse';

export type Player = {
  name: string;
  connected: boolean;
};

export type GameEventType =
  | 'game_created'
  | 'turn_ended'
  | 'ai_turn_started'
  | 'ai_turn_failed'
  | 'player_joined'
  | 'player_left'
  | 'player_connected'
  | 'player_disconnected';

type GameEvent = {
  type: GameEventType;
  timestamp: number;
  data?: Partial<Record<string, string>>;
}

export type MultiplayerGameState = {
  sessionId: string;
  gameId: string;
  dimensions: CanvasDimensions;
  type: GameType;
  players: Record<string, Player>; // map from player name to Player
  currentPlayer: string | null;
  turns: CurveTurn[];
  eventLog: GameEvent[];
};

export type GameStateUpdate = {
  status: string;
  gameState?: MultiplayerGameState;
};

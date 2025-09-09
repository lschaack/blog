import type { CurveTurn } from './exquisiteCorpse';

// FIXME: Get these from zod schemas
export type GameType = 'singleplayer' | 'multiplayer';

export type Player = {
  name: string;
  joinedAt: string;
  connected: boolean;
};

export type GameStatus =
  | 'loading'
  | 'loaded'
  | 'game_started'
  | 'turn_ended'
  | 'ai_turn_started'
  | 'ai_turn_failed'
  | 'player_joined'
  | 'player_left'
  | 'player_connected'
  | 'player_disconnected'
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
  turns: CurveTurn[];
  createdAt: string;
  timestamp: number;
};

export type GameEvent = {
  status: GameStatus;
  gameState?: MultiplayerGameState;
};

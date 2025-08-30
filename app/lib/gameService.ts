import { randomUUID } from 'crypto';
import { getRedisClient } from './redis';
import type {
  MultiplayerGameState,
  Player,
  GameEvent,
  CreateGameRequest,
  JoinGameRequest,
  SubmitTurnRequest
} from '@/app/types/multiplayer';
import { generateAICurveTurn } from '@/app/lib/aiTurnService';
import type { CurveTurn } from '@/app/types/exquisiteCorpse';
import { getCurrentPlayer } from './gameUtils';
import { GameError } from '../api/exquisite-corpse/gameError';

export class GameService {
  private redis = getRedisClient();
  private static MAX_AI_RETRIES = 3;

  async createGame(request: CreateGameRequest): Promise<{ sessionId: string; playerName: string }> {
    const { playerName } = request;
    const sessionId = this.redis.generateSessionId();
    const gameId = randomUUID();

    const now = new Date().toISOString();
    const player: Player = {
      name: playerName,
      joinedAt: now,
      isActive: true,
      connectionStatus: 'disconnected',
      lastSeenAt: now,
    };

    const players: Player[] = [player];
    if (request.gameType === 'singleplayer') {
      players.push({
        name: 'AI',
        joinedAt: now,
        isActive: true,
        connectionStatus: 'connected',
        lastSeenAt: now
      });
    }

    const gameState: Omit<MultiplayerGameState, 'players'> = {
      sessionId,
      gameId,
      type: request.gameType,
      status: 'game_started',
      turns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const initialGameState = await this.redis.initializeGame(sessionId, gameState);
    const initialPlayers = await this.redis.initializePlayers(sessionId, players);

    await this.publishEvent(sessionId, 'game_started', {
      gameState: {
        ...initialGameState,
        players: initialPlayers,
      } as MultiplayerGameState
    });

    return { sessionId, playerName };
  }

  async joinGame(sessionId: string, request: JoinGameRequest): Promise<{ playerName: string }> {
    const { playerName } = request;
    const now = new Date().toISOString();

    const newPlayer: Player = {
      name: playerName,
      joinedAt: now,
      isActive: false,
      connectionStatus: 'disconnected',
      lastSeenAt: now
    };

    await this.redis.addPlayer(sessionId, newPlayer);

    // Publish player left event
    await this.publishEvent(sessionId, 'player_joined', { playerName });

    return { playerName };
  }

  async submitTurn(sessionId: string, playerName: string, request: SubmitTurnRequest): Promise<void> {
    // TODO: See if there's a good way to check that it's the player's turn in a one-trip request
    const turn: CurveTurn = {
      ...request,
      author: playerName,
      timestamp: new Date().toISOString(),
    };

    await this.redis.addTurn(sessionId, turn);

    await this.publishEvent(sessionId, 'turn_ended', { turn });

    // TODO: Get next game state in single trip?
    const nextGameState = await this.redis.getGameState(sessionId);
    const nextPlayer = nextGameState && getCurrentPlayer(nextGameState);
    // If next player is AI, trigger AI turn
    if (nextPlayer?.name === 'AI') {
      await this.startAITurn(sessionId);
    }
  }

  async disconnectPlayer(sessionId: string, playerName: string) {
    const now = new Date().toISOString();

    await this.redis.updatePlayerStatus(sessionId, playerName, {
      connectionStatus: 'disconnected',
      disconnectedAt: now,
      lastSeenAt: now,
    });

    // Publish player disconnected event
    await this.publishEvent(sessionId, 'player_disconnected', {
      playerName,
    });
  }

  async removePlayer(sessionId: string, playerName: string): Promise<void> {
    await this.redis.removePlayer(sessionId, playerName);

    // Publish player left event
    await this.publishEvent(sessionId, 'player_left', {
      playerName,
    });
  }

  async reconnectPlayer(sessionId: string, playerName: string): Promise<void> {
    const now = new Date().toISOString();

    await this.redis.updatePlayerStatus(sessionId, playerName, {
      connectionStatus: 'connected',
      lastSeenAt: now,
      disconnectedAt: undefined
    });

    await this.redis.doPromotion(sessionId);

    // Publish reconnection event
    await this.publishEvent(sessionId, 'player_reconnected', {
      playerName,
    });
  }

  async retryAITurn(sessionId: string): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);

    if (!gameState) {
      throw GameError.GAME_NOT_FOUND(sessionId);
    } else if (gameState.status === 'ai_turn_started') {
      throw GameError.AI_TURN_IN_PROGRESS();
    }

    await this.redis.resetAIRetryCount(sessionId);
    await this.startAITurn(sessionId);
  }

  private async startAITurn(sessionId: string): Promise<void> {
    await this.redis.updateGameStatus(sessionId, 'ai_turn_started');

    await this.publishEvent(sessionId, 'ai_turn_started', {});

    // Process AI turn in background
    this.processAITurnBackground(sessionId).catch(error => {
      console.error('AI turn failed:', error);
    });
  }

  private async getAITurn(sessionId: string) {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) {
      throw new Error('Game state not found during AI processing');
    }

    // Generate AI turn using server-side logic
    const dimensions = { width: 512, height: 512 };
    const aiResponse = await generateAICurveTurn(gameState.turns, dimensions);

    const aiTurn: CurveTurn = {
      ...aiResponse,
      author: 'AI',
      timestamp: new Date().toISOString(),
    };

    return aiTurn;
  }

  private async processAITurnBackground(sessionId: string): Promise<void> {
    try {
      const turn = await this.getAITurn(sessionId);

      await this.redis.addTurn(sessionId, turn);
      await this.redis.resetAIRetryCount(sessionId);

      await this.publishEvent(sessionId, 'turn_ended', { turn });

    } catch (error) {
      await this.handleAITurnFailure(sessionId, error as Error);
    }
  }

  private async handleAITurnFailure(sessionId: string, error: Error): Promise<void> {
    const retryCount = await this.redis.getAIRetryCount(sessionId);
    const newRetryCount = retryCount + 1;

    if (newRetryCount <= GameService.MAX_AI_RETRIES) {
      await this.redis.setAIRetryCount(sessionId, newRetryCount);
      // Retry after a delay
      setTimeout(() => {
        this.processAITurnBackground(sessionId).catch(console.error);
      }, 2000 * newRetryCount); // Exponential backoff
    } else {
      // Max retries reached, mark as failed
      await this.redis.updateGameStatus(sessionId, 'ai_turn_failed');

      await this.publishEvent(sessionId, 'ai_turn_failed', {
        error: error.message,
        retryCount,
      });
    }
  }

  private async publishEvent<T>(sessionId: string, type: string, data: T): Promise<void> {
    const event: GameEvent<T> = {
      type: type as GameEvent<T>['type'],
      timestamp: new Date().toISOString(),
      gameId: sessionId,
      data
    };

    await this.redis.publishEvent(sessionId, event);
  }
}

// Singleton instance
let gameService: GameService | null = null;

export const getGameService = (): GameService => {
  if (!gameService) {
    gameService = new GameService();
  }
  return gameService;
};

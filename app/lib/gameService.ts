import { randomUUID } from 'crypto';
import { getRedisClient } from './redis';
import type {
  Player,
  GameEvent,
  GameStatus,
  MultiplayerGameState
} from '@/app/types/multiplayer';
import { generateAICurveTurn } from '@/app/lib/aiTurnService';
import type { CurveTurn, Line } from '@/app/types/exquisiteCorpse';
import { getCurrentPlayer } from './gameUtils';
import { generateSessionId } from '../exquisite-corpse/sessionId';
import { CreateGameRequest } from '../api/exquisite-corpse/schemas';

export class GameService {
  private redis = getRedisClient();
  private static MAX_AI_RETRIES = 3;

  async createGame(request: CreateGameRequest): Promise<{ sessionId: string }> {
    const sessionId = generateSessionId();
    const gameId = randomUUID();

    const players: Record<string, Player> = {};
    if (request.gameType === 'singleplayer') {
      players['AI'] = {
        name: 'AI',
        joinedAt: new Date().toISOString(),
      };
    }

    const gameState = await this.redis.initializeGame(sessionId, {
      sessionId,
      gameId,
      type: request.gameType,
      turns: [],
      players,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
    });

    await this.publishEvent(sessionId, 'game_started', gameState);

    return { sessionId };
  }

  async addPlayer(sessionId: string, name: string) {
    const newPlayer: Player = {
      name,
      joinedAt: new Date().toISOString(),
    };

    const gameState = await this.redis.addPlayer(sessionId, newPlayer);

    // Publish player left event
    await this.publishEvent(sessionId, 'player_joined', gameState);
  }

  async removePlayer(sessionId: string, playerName: string): Promise<void> {
    const gameState = await this.redis.removePlayer(sessionId, playerName);

    // Publish player left event
    await this.publishEvent(sessionId, 'player_left', gameState);
  }

  async submitTurn(sessionId: string, playerName: string, path: Line): Promise<void> {
    const turn: CurveTurn = {
      path,
      author: playerName,
      timestamp: new Date().toISOString(),
    };

    const gameState = await this.redis.addTurn(sessionId, turn);

    await this.publishEvent(sessionId, 'turn_ended', gameState);

    const nextPlayer = getCurrentPlayer(gameState);
    // If next player is AI, trigger AI turn
    if (nextPlayer?.name === 'AI') {
      await this.startAITurn(sessionId, gameState);
    }
  }

  async retryAITurn(sessionId: string): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);

    // FIXME: How do I prevent simultaneous AI turns?
    // TODO: Add check for ai having next turn

    await this.redis.resetAIRetryCount(sessionId);
    await this.startAITurn(sessionId, gameState);
  }

  private async startAITurn(sessionId: string, gameState: MultiplayerGameState): Promise<void> {
    await this.publishEvent(sessionId, 'ai_turn_started');

    // Process AI turn in background
    this.processAITurnBackground(sessionId, gameState).catch(error => {
      console.error('AI turn failed:', error);
    });
  }

  private async getAITurn(gameState: MultiplayerGameState) {
    const dimensions = { width: 512, height: 512 };
    const aiResponse = await generateAICurveTurn(gameState.turns, dimensions);

    const aiTurn: CurveTurn = {
      ...aiResponse,
      author: 'AI',
      timestamp: new Date().toISOString(),
    };

    return aiTurn;
  }

  private async processAITurnBackground(sessionId: string, gameState: MultiplayerGameState): Promise<void> {
    try {
      const turn = await this.getAITurn(gameState);

      const nextGameState = await this.redis.addTurn(sessionId, turn);

      this.publishEvent(sessionId, 'turn_ended', nextGameState);

      await this.redis.resetAIRetryCount(sessionId);
    } catch (error) {
      console.error(`AI turn failed: ${error}`)
      await this.handleAITurnFailure(sessionId);
    }
  }

  private async handleAITurnFailure(sessionId: string): Promise<void> {
    const retryCount = await this.redis.getAIRetryCount(sessionId);
    const newRetryCount = retryCount + 1;

    if (newRetryCount <= GameService.MAX_AI_RETRIES) {
      await this.redis.setAIRetryCount(sessionId, newRetryCount);
      const gameState = await this.redis.getGameState(sessionId);
      // Retry after a delay
      setTimeout(() => {
        this.processAITurnBackground(sessionId, gameState).catch(console.error);
      }, 2000 * newRetryCount); // Exponential backoff
    } else {
      // Max retries reached, mark as failed
      await this.publishEvent(sessionId, 'ai_turn_failed');
    }
  }

  private async publishEvent(
    sessionId: string,
    status: GameStatus,
    gameState?: MultiplayerGameState,
  ): Promise<void> {
    const event: GameEvent = { status, gameState };

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

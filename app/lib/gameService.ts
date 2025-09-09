import { randomUUID } from 'crypto';
import { getGameEventManager, getRedisClient, SSEClient } from './redis';
import type {
  Player,
  GameEvent,
  GameStatus,
  MultiplayerGameState,
  GameType
} from '@/app/types/multiplayer';
import { generateAICurveTurn } from '@/app/lib/aiTurnService';
import type { CurveTurn, Line } from '@/app/types/exquisiteCorpse';
import { getCurrentPlayer } from './gameUtils';
import { generateSessionId } from '../exquisite-corpse/sessionId';

export class GameService {
  private redis = getRedisClient();
  private eventManager = getGameEventManager();
  private static MAX_AI_RETRIES = 3;

  async createGame(type: GameType): Promise<{ sessionId: string }> {
    const sessionId = generateSessionId();
    const gameId = randomUUID();

    const players: Record<string, Player> = {};
    if (type === 'singleplayer') {
      players['AI'] = {
        name: 'AI',
        connected: true,
        joinedAt: new Date().toISOString(),
      };
    }

    await this.redis.initializeGame(sessionId, {
      sessionId,
      gameId,
      type,
      turns: [],
      players,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
    });

    return { sessionId };
  }

  async join(sessionId: string, name: string, token: string) {
    const newPlayer: Player = {
      name,
      connected: false,
      joinedAt: new Date().toISOString(),
    };

    const gameState = await this.redis.join(sessionId, newPlayer, token);

    await this.publishEvent(sessionId, 'player_joined', gameState);
  }

  async leave(sessionId: string, playerName: string, playerToken: string): Promise<void> {
    const gameState = await this.redis.leave(sessionId, playerName, playerToken);

    await this.publishEvent(sessionId, 'player_left', gameState);
  }

  async connect(sessionId: string, playerName: string, playerToken: string, connectionToken: string, client: SSEClient) {
    const gameState = await this.redis.connectPlayer(sessionId, playerName, playerToken, connectionToken);

    this.eventManager.subscribeToGame(sessionId, connectionToken, client);

    await this.publishEvent(sessionId, 'player_connected', gameState);

    return gameState;
  }

  async disconnect(sessionId: string, playerName: string, connectionToken: string): Promise<void> {
    const gameState = await this.redis.disconnectPlayer(sessionId, playerName, connectionToken);

    this.eventManager.unsubscribeFromGame(sessionId, connectionToken);

    await this.publishEvent(sessionId, 'player_disconnected', gameState);
  }

  async submitTurn(sessionId: string, playerName: string, playerToken: string, path: Line): Promise<void> {
    const turn: CurveTurn = {
      path,
      author: playerName,
      timestamp: new Date().toISOString(),
    };

    const gameState = await this.redis.addTurn(
      sessionId,
      turn,
      playerName,
      playerToken
    );

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

      const nextGameState = await this.redis.addAiTurn(sessionId, turn);

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

    await this.eventManager.publishEvent(sessionId, event);
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
